import { and, asc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '../index.js';
import { user } from '../schema/auth.js';
import { customer } from '../schema/customer.js';
import { invoice } from '../schema/invoice.js';
import { jobAssignment } from '../schema/job-assignment.js';
import { job } from '../schema/job.js';
import { serviceRequest } from '../schema/service-request.js';
import { technician } from '../schema/technician.js';
import type {
  SearchGroupDto,
  SearchResponseDto,
  SearchResultDto,
} from '../../search/dto/search-response.dto.js';

export const SEARCH_LIMIT_PER_GROUP = 5;
export type SearchScope =
  { role: 'manager' } | { role: 'technician'; userId: string };

/** All matching and access predicates execute in SQL before the result limit. */
export async function searchOrganization(
  organizationId: string,
  query: string,
  scope: SearchScope,
): Promise<SearchResponseDto> {
  // Treat LIKE metacharacters as literal input, and bind the value as a parameter.
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const matches = (...columns: AnyPgColumn[]): SQL =>
    or(...columns.map((column) => ilike(column, pattern)))!;
  const technicianUserId =
    scope.role === 'technician' ? scope.userId : undefined;

  // Mirrors the existing detail permissions: only active assignments confer access.
  const assignedJobs = db
    .select({
      id: job.id,
      customerId: job.customerId,
      requestId: job.requestId,
    })
    .from(job)
    .innerJoin(
      jobAssignment,
      and(
        eq(jobAssignment.jobId, job.id),
        eq(jobAssignment.organizationId, job.organizationId),
      ),
    )
    .innerJoin(
      technician,
      and(
        eq(technician.id, jobAssignment.technicianId),
        eq(technician.organizationId, job.organizationId),
      ),
    )
    .where(
      and(
        eq(job.organizationId, organizationId),
        eq(jobAssignment.status, 'ASSIGNED'),
        eq(technician.userId, technicianUserId ?? ''),
      ),
    )
    .as('search_assigned_jobs');

  const [customers, requests, jobs, technicians, invoices] = await Promise.all([
    db
      .select({
        id: customer.id,
        title: customer.name,
        phone: customer.phone,
        email: customer.email,
        status: customer.status,
      })
      .from(customer)
      .where(
        and(
          eq(customer.organizationId, organizationId),
          matches(customer.id, customer.name, customer.phone, customer.email),
          technicianUserId !== undefined
            ? inArray(
                customer.id,
                db.select({ id: assignedJobs.customerId }).from(assignedJobs),
              )
            : undefined,
        ),
      )
      .orderBy(asc(customer.name), asc(customer.id))
      .limit(SEARCH_LIMIT_PER_GROUP + 1),
    db
      .select({
        id: serviceRequest.id,
        title: serviceRequest.title,
        customerName: customer.name,
        status: serviceRequest.status,
      })
      .from(serviceRequest)
      .innerJoin(
        customer,
        and(
          eq(customer.id, serviceRequest.customerId),
          eq(customer.organizationId, serviceRequest.organizationId),
        ),
      )
      .where(
        and(
          eq(serviceRequest.organizationId, organizationId),
          matches(
            serviceRequest.id,
            serviceRequest.title,
            serviceRequest.description,
            customer.name,
          ),
          technicianUserId !== undefined
            ? inArray(
                serviceRequest.id,
                db.select({ id: assignedJobs.requestId }).from(assignedJobs),
              )
            : undefined,
        ),
      )
      .orderBy(asc(serviceRequest.title), asc(serviceRequest.id))
      .limit(SEARCH_LIMIT_PER_GROUP + 1),
    db
      .select({
        id: job.id,
        title: job.title,
        customerName: customer.name,
        location: job.location,
        status: job.status,
      })
      .from(job)
      .innerJoin(
        customer,
        and(
          eq(customer.id, job.customerId),
          eq(customer.organizationId, job.organizationId),
        ),
      )
      .where(
        and(
          eq(job.organizationId, organizationId),
          matches(
            job.id,
            job.title,
            job.description,
            job.location,
            customer.name,
          ),
          technicianUserId !== undefined
            ? inArray(
                job.id,
                db.select({ id: assignedJobs.id }).from(assignedJobs),
              )
            : undefined,
        ),
      )
      .orderBy(asc(job.title), asc(job.id))
      .limit(SEARCH_LIMIT_PER_GROUP + 1),
    db
      .select({
        id: technician.id,
        title: user.name,
        employeeCode: technician.employeeCode,
        phone: technician.phone,
        email: user.email,
        status: technician.status,
      })
      .from(technician)
      .innerJoin(user, eq(user.id, technician.userId))
      .where(
        and(
          eq(technician.organizationId, organizationId),
          matches(
            technician.id,
            technician.employeeCode,
            technician.phone,
            user.name,
            user.email,
          ),
          technicianUserId !== undefined
            ? eq(technician.userId, technicianUserId)
            : undefined,
        ),
      )
      .orderBy(asc(user.name), asc(technician.id))
      .limit(SEARCH_LIMIT_PER_GROUP + 1),
    db
      .select({
        id: invoice.id,
        title: invoice.invoiceNumber,
        customerName: customer.name,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
      })
      .from(invoice)
      .innerJoin(
        customer,
        and(
          eq(customer.id, invoice.customerId),
          eq(customer.organizationId, invoice.organizationId),
        ),
      )
      .where(
        and(
          eq(invoice.organizationId, organizationId),
          matches(invoice.id, invoice.invoiceNumber, customer.name),
          technicianUserId !== undefined
            ? inArray(
                invoice.jobId,
                db.select({ id: assignedJobs.id }).from(assignedJobs),
              )
            : undefined,
        ),
      )
      .orderBy(asc(invoice.invoiceNumber), asc(invoice.id))
      .limit(SEARCH_LIMIT_PER_GROUP + 1),
  ]);

  function group(
    type: SearchGroupDto['type'],
    rows: SearchResultDto[],
  ): SearchGroupDto {
    return {
      type,
      results: rows.slice(0, SEARCH_LIMIT_PER_GROUP),
      hasMore: rows.length > SEARCH_LIMIT_PER_GROUP,
    };
  }

  return {
    query,
    limitPerGroup: SEARCH_LIMIT_PER_GROUP,
    groups: [
      group(
        'customers',
        customers.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          description: [row.phone, row.email].filter(Boolean).join(' · '),
        })),
      ),
      group(
        'serviceRequests',
        requests.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          description: row.customerName,
        })),
      ),
      group(
        'jobs',
        jobs.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          description: [row.customerName, row.location]
            .filter(Boolean)
            .join(' · '),
        })),
      ),
      group(
        'technicians',
        technicians.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          description: [row.employeeCode, row.phone, row.email]
            .filter(Boolean)
            .join(' · '),
        })),
      ),
      group(
        'invoices',
        invoices.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          description: `${row.customerName} · ${row.currency} ${row.total}`,
        })),
      ),
    ],
  };
}
