import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../index.js';
import { customer } from '../schema/customer.js';
import { invoice } from '../schema/invoice.js';
import { job } from '../schema/job.js';
import { jobAssignment } from '../schema/job-assignment.js';
import { payment } from '../schema/payment.js';
import { serviceRequest } from '../schema/service-request.js';
import { technician } from '../schema/technician.js';

export type AnalyticsDateRange = {
  fromDate?: Date;
  toDate?: Date;
};

export type RevenueTrendPeriod = 'day' | 'week' | 'month';

export type AnalyticsPage = {
  limit: number;
  offset: number;
};

const OPEN_REQUEST_STATUSES = ['NEW', 'IN_REVIEW'] as const;
const ACTIVE_JOB_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
] as const;
const OUTSTANDING_INVOICE_STATUSES = [
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const;

function pushTimestampRange(
  conditions: SQL[],
  column: Parameters<typeof gte>[0],
  range?: AnalyticsDateRange,
) {
  if (range?.fromDate) conditions.push(gte(column, range.fromDate));
  if (range?.toDate) conditions.push(lte(column, range.toDate));
}

/**
 * Prefer paidAt; fall back to createdAt when paidAt is null.
 * Dates in raw `sql` fragments must be ISO strings — postgres.js rejects
 * Date objects in tagged templates (ERR_INVALID_ARG_TYPE / Buffer.byteLength).
 */
function pushPaymentPaidRange(conditions: SQL[], range?: AnalyticsDateRange) {
  if (range?.fromDate) {
    conditions.push(
      sql`coalesce(${payment.paidAt}, ${payment.createdAt}) >= ${range.fromDate.toISOString()}`,
    );
  }
  if (range?.toDate) {
    conditions.push(
      sql`coalesce(${payment.paidAt}, ${payment.createdAt}) <= ${range.toDate.toISOString()}`,
    );
  }
}

export async function countActiveCustomers(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  const conditions: SQL[] = [
    eq(customer.organizationId, organizationId),
    eq(customer.status, 'ACTIVE'),
  ];
  pushTimestampRange(conditions, customer.createdAt, range);

  const [row] = await db
    .select({ value: count() })
    .from(customer)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

export async function countOpenServiceRequests(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  const conditions: SQL[] = [
    eq(serviceRequest.organizationId, organizationId),
    inArray(serviceRequest.status, [...OPEN_REQUEST_STATUSES]),
  ];
  pushTimestampRange(conditions, serviceRequest.createdAt, range);

  const [row] = await db
    .select({ value: count() })
    .from(serviceRequest)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

export async function countJobsByStatuses(
  organizationId: string,
  statuses: readonly (
    | 'DRAFT'
    | 'CONFIRMED'
    | 'EN_ROUTE'
    | 'ARRIVED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
  )[],
  range?: AnalyticsDateRange,
  options?: { useCompletedAt?: boolean },
): Promise<number> {
  const conditions: SQL[] = [
    eq(job.organizationId, organizationId),
    inArray(job.status, [...statuses]),
  ];
  if (options?.useCompletedAt) {
    if (range?.fromDate) conditions.push(gte(job.completedAt, range.fromDate));
    if (range?.toDate) conditions.push(lte(job.completedAt, range.toDate));
  } else {
    pushTimestampRange(conditions, job.createdAt, range);
  }

  const [row] = await db
    .select({ value: count() })
    .from(job)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

export async function countOutstandingInvoices(
  organizationId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(invoice)
    .where(
      and(
        eq(invoice.organizationId, organizationId),
        inArray(invoice.status, [...OUTSTANDING_INVOICE_STATUSES]),
        sql`${invoice.amountDue}::numeric > 0`,
      ),
    );

  return Number(row?.value ?? 0);
}

/** Sum of SUCCEEDED payment amounts (source of truth for revenue collected). */
export async function sumSucceededPayments(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<string> {
  const conditions: SQL[] = [
    eq(payment.organizationId, organizationId),
    eq(payment.status, 'SUCCEEDED'),
  ];
  pushPaymentPaidRange(conditions, range);

  const [row] = await db
    .select({
      value: sql<string>`coalesce(sum(${payment.amount}::numeric), 0)`,
    })
    .from(payment)
    .where(and(...conditions));

  return normalizeMoney(row?.value);
}

/** Issued (non-draft, non-void) invoice totals — not revenue collected. */
export async function sumInvoicedAmounts(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<string> {
  const conditions: SQL[] = [
    eq(invoice.organizationId, organizationId),
    ne(invoice.status, 'VOID'),
    ne(invoice.status, 'DRAFT'),
  ];
  if (range?.fromDate) {
    conditions.push(
      sql`coalesce(${invoice.issuedAt}, ${invoice.createdAt}) >= ${range.fromDate.toISOString()}`,
    );
  }
  if (range?.toDate) {
    conditions.push(
      sql`coalesce(${invoice.issuedAt}, ${invoice.createdAt}) <= ${range.toDate.toISOString()}`,
    );
  }

  const [row] = await db
    .select({
      value: sql<string>`coalesce(sum(${invoice.total}::numeric), 0)`,
    })
    .from(invoice)
    .where(and(...conditions));

  return normalizeMoney(row?.value);
}

export async function sumOutstandingBalances(
  organizationId: string,
): Promise<string> {
  const [row] = await db
    .select({
      value: sql<string>`coalesce(sum(${invoice.amountDue}::numeric), 0)`,
    })
    .from(invoice)
    .where(
      and(
        eq(invoice.organizationId, organizationId),
        inArray(invoice.status, [...OUTSTANDING_INVOICE_STATUSES]),
        sql`${invoice.amountDue}::numeric > 0`,
      ),
    );

  return normalizeMoney(row?.value);
}

export async function countJobsGroupedByStatus(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<Array<{ status: string; count: number }>> {
  const conditions: SQL[] = [eq(job.organizationId, organizationId)];
  pushTimestampRange(conditions, job.createdAt, range);

  const rows = await db
    .select({
      status: job.status,
      count: count(),
    })
    .from(job)
    .where(and(...conditions))
    .groupBy(job.status);

  return rows.map((row) => ({
    status: row.status,
    count: Number(row.count),
  }));
}

export async function listRevenueTrends(
  organizationId: string,
  period: RevenueTrendPeriod,
  range?: AnalyticsDateRange,
): Promise<Array<{ periodStart: string; amount: string; paymentCount: number }>> {
  const conditions: SQL[] = [
    eq(payment.organizationId, organizationId),
    eq(payment.status, 'SUCCEEDED'),
  ];
  pushPaymentPaidRange(conditions, range);

  const effective = sql`coalesce(${payment.paidAt}, ${payment.createdAt})`;
  const bucket =
    period === 'day'
      ? sql<string>`to_char(date_trunc('day', ${effective}), 'YYYY-MM-DD')`
      : period === 'week'
        ? sql<string>`to_char(date_trunc('week', ${effective}), 'YYYY-MM-DD')`
        : sql<string>`to_char(date_trunc('month', ${effective}), 'YYYY-MM-01')`;

  const rows = await db
    .select({
      periodStart: bucket,
      amount: sql<string>`coalesce(sum(${payment.amount}::numeric), 0)`,
      paymentCount: count(),
    })
    .from(payment)
    .where(and(...conditions))
    .groupBy(bucket)
    .orderBy(bucket);

  return rows.map((row) => ({
    periodStart: row.periodStart,
    amount: normalizeMoney(row.amount),
    paymentCount: Number(row.paymentCount),
  }));
}

export async function countSucceededPayments(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  const conditions: SQL[] = [
    eq(payment.organizationId, organizationId),
    eq(payment.status, 'SUCCEEDED'),
  ];
  pushPaymentPaidRange(conditions, range);

  const [row] = await db
    .select({ value: count() })
    .from(payment)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

export type TechnicianWorkloadRow = {
  technicianId: string;
  employeeCode: string;
  status: string;
  userId: string;
  assignedJobs: number;
  completedJobs: number;
  activeJobs: number;
};

export async function listTechnicianWorkload(
  organizationId: string,
  range: AnalyticsDateRange | undefined,
  page: AnalyticsPage,
): Promise<{ rows: TechnicianWorkloadRow[]; total: number }> {
  const joinParts: SQL[] = [
    eq(jobAssignment.technicianId, technician.id),
    eq(jobAssignment.organizationId, organizationId),
    eq(jobAssignment.status, 'ASSIGNED'),
  ];
  if (range?.fromDate) {
    joinParts.push(gte(jobAssignment.assignedAt, range.fromDate));
  }
  if (range?.toDate) {
    joinParts.push(lte(jobAssignment.assignedAt, range.toDate));
  }

  const [totalRow] = await db
    .select({ value: count() })
    .from(technician)
    .where(eq(technician.organizationId, organizationId));

  const rows = await db
    .select({
      technicianId: technician.id,
      employeeCode: technician.employeeCode,
      status: technician.status,
      userId: technician.userId,
      assignedJobs: sql<number>`coalesce(count(distinct ${jobAssignment.jobId}) filter (where ${jobAssignment.id} is not null), 0)`,
      completedJobs: sql<number>`coalesce(count(distinct ${job.id}) filter (where ${job.status} = 'COMPLETED'), 0)`,
      activeJobs: sql<number>`coalesce(count(distinct ${job.id}) filter (where ${job.status} in ('DRAFT', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS') and ${jobAssignment.status} = 'ASSIGNED'), 0)`,
    })
    .from(technician)
    .leftJoin(jobAssignment, and(...joinParts))
    .leftJoin(
      job,
      and(
        eq(job.id, jobAssignment.jobId),
        eq(job.organizationId, organizationId),
      ),
    )
    .where(eq(technician.organizationId, organizationId))
    .groupBy(
      technician.id,
      technician.employeeCode,
      technician.status,
      technician.userId,
    )
    .orderBy(
      desc(sql`count(distinct ${jobAssignment.jobId})`),
      technician.employeeCode,
    )
    .limit(page.limit)
    .offset(page.offset);

  return {
    total: Number(totalRow?.value ?? 0),
    rows: rows.map((row) => ({
      technicianId: row.technicianId,
      employeeCode: row.employeeCode,
      status: row.status,
      userId: row.userId,
      assignedJobs: Number(row.assignedJobs),
      completedJobs: Number(row.completedJobs),
      activeJobs: Number(row.activeJobs),
    })),
  };
}

export async function countNewCustomers(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  return countActiveCustomers(organizationId, range);
}

/** Customers with two or more completed jobs (optionally completed in range). */
export async function countRepeatCustomers(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  const conditions: SQL[] = [
    eq(job.organizationId, organizationId),
    eq(job.status, 'COMPLETED'),
  ];
  if (range?.fromDate) conditions.push(gte(job.completedAt, range.fromDate));
  if (range?.toDate) conditions.push(lte(job.completedAt, range.toDate));

  const grouped = db
    .select({
      customerId: job.customerId,
      jobs: count(),
    })
    .from(job)
    .where(and(...conditions))
    .groupBy(job.customerId)
    .having(sql`count(*) >= 2`)
    .as('repeat_customers');

  const [row] = await db.select({ value: count() }).from(grouped);
  return Number(row?.value ?? 0);
}

export async function countServiceRequests(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  const conditions: SQL[] = [
    eq(serviceRequest.organizationId, organizationId),
  ];
  pushTimestampRange(conditions, serviceRequest.createdAt, range);

  const [row] = await db
    .select({ value: count() })
    .from(serviceRequest)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

export type CustomerActivityRow = {
  customerId: string;
  name: string;
  status: string;
  serviceRequestCount: number;
  completedJobCount: number;
  createdAt: Date;
};

export async function listCustomerActivity(
  organizationId: string,
  range: AnalyticsDateRange | undefined,
  page: AnalyticsPage,
): Promise<{ rows: CustomerActivityRow[]; total: number }> {
  const customerConditions: SQL[] = [
    eq(customer.organizationId, organizationId),
  ];
  pushTimestampRange(customerConditions, customer.createdAt, range);

  const [totalRow] = await db
    .select({ value: count() })
    .from(customer)
    .where(and(...customerConditions));

  const srFrom = range?.fromDate
    ? sql`and ${serviceRequest.createdAt} >= ${range.fromDate.toISOString()}`
    : sql``;
  const srTo = range?.toDate
    ? sql`and ${serviceRequest.createdAt} <= ${range.toDate.toISOString()}`
    : sql``;
  const jobFrom = range?.fromDate
    ? sql`and ${job.completedAt} >= ${range.fromDate.toISOString()}`
    : sql``;
  const jobTo = range?.toDate
    ? sql`and ${job.completedAt} <= ${range.toDate.toISOString()}`
    : sql``;

  const srCount = sql<number>`(
    select count(*)::int from ${serviceRequest}
    where ${serviceRequest.customerId} = ${customer.id}
      and ${serviceRequest.organizationId} = ${organizationId}
      ${srFrom}
      ${srTo}
  )`;

  const completedCount = sql<number>`(
    select count(*)::int from ${job}
    where ${job.customerId} = ${customer.id}
      and ${job.organizationId} = ${organizationId}
      and ${job.status} = 'COMPLETED'
      ${jobFrom}
      ${jobTo}
  )`;

  const rows = await db
    .select({
      customerId: customer.id,
      name: customer.name,
      status: customer.status,
      serviceRequestCount: srCount,
      completedJobCount: completedCount,
      createdAt: customer.createdAt,
    })
    .from(customer)
    .where(and(...customerConditions))
    .orderBy(desc(customer.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  return {
    total: Number(totalRow?.value ?? 0),
    rows: rows.map((row) => ({
      customerId: row.customerId,
      name: row.name,
      status: row.status,
      serviceRequestCount: Number(row.serviceRequestCount),
      completedJobCount: Number(row.completedJobCount),
      createdAt: row.createdAt,
    })),
  };
}

export async function countDistinctCustomersWithJobs(
  organizationId: string,
  range?: AnalyticsDateRange,
): Promise<number> {
  const conditions: SQL[] = [
    eq(job.organizationId, organizationId),
    eq(job.status, 'COMPLETED'),
  ];
  if (range?.fromDate) conditions.push(gte(job.completedAt, range.fromDate));
  if (range?.toDate) conditions.push(lte(job.completedAt, range.toDate));

  const [row] = await db
    .select({ value: countDistinct(job.customerId) })
    .from(job)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

function normalizeMoney(value: string | null | undefined): string {
  if (value == null) return '0.00';
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return '0.00';
  return asNumber.toFixed(2);
}

export const ANALYTICS_ACTIVE_JOB_STATUSES = ACTIVE_JOB_STATUSES;
