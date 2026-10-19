"use client";

import Link from "next/link";
import { type ElementType, type ReactNode } from "react";
import {
  LuBell,
  LuBriefcase,
  LuCalendarClock,
  LuUsers,
  LuWrench,
} from "react-icons/lu";

import { InvoiceStatusBadge } from "@/components/invoices/invoice-badges";
import { useOrg } from "@/components/providers/org-provider";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, formatMoney, sumMoneyStrings } from "@/lib/format";
import { useAuditLogsQuery } from "@/lib/query/audit-logs";
import { useInvoicesQuery } from "@/lib/query/invoices";
import { useJobsQuery } from "@/lib/query/jobs";
import type { ServerQueryState } from "@/lib/query/query-state";
import { useServiceRequestsQuery } from "@/lib/query/service-requests";
import { useTechniciansQuery } from "@/lib/query/technicians";
import { cn } from "@/lib/utils";
import type {
  AuditLog,
  Invoice,
  InvoiceStatus,
  Job,
  JobStatus,
  MemberRole,
} from "@/lib/types";

const RECENT_LIMIT = 8;

const JOBS_HREF = "/dashboard/jobs";
const DISPATCH_HREF = "/dashboard/dispatch";
const SERVICE_REQUESTS_HREF = "/dashboard/service-requests";
const CUSTOMERS_HREF = "/dashboard/customers";
const TECHNICIANS_HREF = "/dashboard/technicians";
const INVOICES_HREF = "/dashboard/invoices";

/** Jobs that are still open. Matches the API active job statuses. */
const OPEN_JOB_STATUSES = new Set<JobStatus>([
  "DRAFT",
  "CONFIRMED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
]);

/** Invoices that are not paid and not void. */
const PENDING_INVOICE_STATUSES = new Set<InvoiceStatus>([
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "OVERDUE",
]);

const LOADING_KPIS = [
  { label: "Open Jobs", href: JOBS_HREF },
  { label: "Service Requests", href: SERVICE_REQUESTS_HREF },
  { label: "Active Technicians", href: TECHNICIANS_HREF },
  { label: "Pending Invoices", href: INVOICES_HREF },
] as const;

const QUICK_ACTIONS: {
  href: string;
  label: string;
  icon: ElementType;
  roles?: MemberRole[];
}[] = [
  {
    href: `${SERVICE_REQUESTS_HREF}?create=1`,
    label: "New Service Request",
    icon: LuBell,
  },
  { href: `${JOBS_HREF}?create=1`, label: "Create Job", icon: LuBriefcase },
  {
    href: DISPATCH_HREF,
    label: "Open Dispatch",
    icon: LuCalendarClock,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
  { href: `${CUSTOMERS_HREF}?create=1`, label: "Add Customer", icon: LuUsers },
  {
    href: `${TECHNICIANS_HREF}?create=1`,
    label: "Add Technician",
    icon: LuWrench,
    roles: ["OWNER", "ADMIN", "DISPATCHER"],
  },
];

const AUDIT_LABELS: Record<string, string> = {
  ORGANIZATION_CREATED: "Organization created",
  MEMBER_UPDATED: "Member updated",
  MEMBER_REMOVED: "Member removed",
  INVITATION_CREATED: "Invitation sent",
  INVITATION_ACCEPTED: "Invitation accepted",
  CUSTOMER_CREATED: "Customer added",
  CUSTOMER_UPDATED: "Customer updated",
  CUSTOMER_DEACTIVATED: "Customer deactivated",
  SERVICE_REQUEST_CREATED: "Service request created",
  SERVICE_REQUEST_UPDATED: "Service request updated",
  SERVICE_REQUEST_CANCELLED: "Service request cancelled",
  JOB_CREATED: "Job created",
  JOB_SCHEDULED: "Job scheduled",
  JOB_ASSIGNED: "Job assigned",
  JOB_STATUS_CHANGED: "Job status changed",
  JOB_COMPLETED: "Job completed",
  JOB_CANCELLED: "Job cancelled",
  INVOICE_CREATED: "Invoice created",
  INVOICE_SENT: "Invoice sent",
  INVOICE_VOIDED: "Invoice voided",
  PAYMENT_RECORDED: "Payment recorded",
  PAYMENT_REFUNDED: "Payment refunded",
  AUTOMATION_RULE_CREATED: "Automation rule created",
  AUTOMATION_RULE_UPDATED: "Automation rule updated",
  AUTOMATION_RULE_ACTIVATED: "Automation rule activated",
  AUTOMATION_RULE_DEACTIVATED: "Automation rule deactivated",
  AUTOMATION_EXECUTION_FAILED: "Automation failed",
};

const ENTITY_HREF: Record<string, string> = {
  JOB: JOBS_HREF,
  SERVICE_REQUEST: SERVICE_REQUESTS_HREF,
  CUSTOMER: CUSTOMERS_HREF,
  INVOICE: INVOICES_HREF,
  PAYMENT: INVOICES_HREF,
};

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  EN_ROUTE: "En route",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type ActivityItem = {
  id: string;
  label: string;
  at: string;
  href?: string;
};

const cardClassName = "rounded-2xl border border-border bg-card p-5";

function canViewAudit(role: MemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function auditLabel(action: string): string {
  const known = AUDIT_LABELS[action];
  if (known) return known;
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatTimestamp(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(
      date,
    );
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      ...options,
      timeZone: "UTC",
    }).format(date);
  }
}

function recentJobs(jobs: Job[]): ActivityItem[] {
  return [...jobs]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, RECENT_LIMIT)
    .map((job) => ({
      id: job.id,
      label: `${job.title} · ${JOB_STATUS_LABEL[job.status]}`,
      at: job.updatedAt,
      href: JOBS_HREF,
    }));
}

function recentAudit(logs: AuditLog[]): ActivityItem[] {
  return logs.slice(0, RECENT_LIMIT).map((log) => ({
    id: log.id,
    label: auditLabel(log.action),
    at: log.createdAt,
    href: ENTITY_HREF[log.entityType],
  }));
}

export function DashboardOverview() {
  const { current } = useOrg();

  if (!current) {
    return (
      <DashboardFrame organizationName={null} syncLabel={null}>
        <KpiGrid>
          {LOADING_KPIS.map((item) => (
            <KpiCard
              key={item.label}
              label={item.label}
              href={item.href}
              isLoading
              isError={false}
              isFetching={false}
              isStale={false}
              count={null}
              emptyLabel={null}
              errorMessage={null}
              unauthorized={false}
              onRetry={() => undefined}
            />
          ))}
        </KpiGrid>
      </DashboardFrame>
    );
  }

  return (
    <DashboardData
      organizationId={current.id}
      role={current.role}
      timeZone={current.timezone}
      organizationName={current.name}
    />
  );
}

function DashboardData({
  organizationId,
  role,
  timeZone,
  organizationName,
}: {
  organizationId: string;
  role: MemberRole;
  timeZone: string;
  organizationName: string;
}) {
  const viewAudit = canViewAudit(role);

  const jobsQuery = useJobsQuery(organizationId);
  const requestsQuery = useServiceRequestsQuery(organizationId);
  const techniciansQuery = useTechniciansQuery(organizationId);
  const invoicesQuery = useInvoicesQuery(organizationId);
  const auditQuery = useAuditLogsQuery(organizationId, RECENT_LIMIT, viewAudit);

  const openJobCount = jobsQuery.jobs.filter((job) =>
    OPEN_JOB_STATUSES.has(job.status),
  ).length;
  const openJobEmpty =
    jobsQuery.server.isSuccess && openJobCount === 0
      ? jobsQuery.jobs.length === 0
        ? "No jobs yet"
        : "No open jobs"
      : null;

  const requestCount = requestsQuery.serviceRequests.length;
  const requestEmpty =
    requestsQuery.server.isSuccess && requestCount === 0
      ? "No service requests yet"
      : null;

  const activeTechnicianCount = techniciansQuery.technicians.filter(
    (technician) => technician.status === "ACTIVE",
  ).length;
  const technicianEmpty =
    techniciansQuery.server.isSuccess && activeTechnicianCount === 0
      ? techniciansQuery.technicians.length === 0
        ? "No technicians yet"
        : "No active technicians"
      : null;

  const pendingInvoiceCount = invoicesQuery.invoices.filter((invoice) =>
    PENDING_INVOICE_STATUSES.has(invoice.status),
  ).length;
  const invoiceEmpty =
    invoicesQuery.server.isSuccess && pendingInvoiceCount === 0
      ? invoicesQuery.invoices.length === 0
        ? "No invoices yet"
        : "No pending invoices"
      : null;

  const activeInvoices = invoicesQuery.invoices.filter(
    (invoice) => invoice.status !== "VOID",
  );
  const outstandingAmount = sumMoneyStrings(
    activeInvoices.map((invoice) => invoice.amountDue),
  );
  const paidAmount = sumMoneyStrings(
    activeInvoices.map((invoice) => invoice.amountPaid),
  );
  const billingCurrency =
    invoicesQuery.invoices[0]?.currency ?? "USD";
  const recentPaidInvoices = [...invoicesQuery.invoices]
    .filter(
      (invoice) =>
        invoice.status !== "VOID" &&
        Number(invoice.amountPaid) > 0,
    )
    .sort((a, b) => {
      const aTime = Date.parse(a.paidAt ?? a.updatedAt);
      const bTime = Date.parse(b.paidAt ?? b.updatedAt);
      return bTime - aTime;
    })
    .slice(0, RECENT_LIMIT);

  const syncing =
    jobsQuery.server.isFetching ||
    requestsQuery.server.isFetching ||
    techniciansQuery.server.isFetching ||
    invoicesQuery.server.isFetching ||
    (viewAudit && auditQuery.server.isFetching);

  const stale =
    jobsQuery.server.isStale ||
    requestsQuery.server.isStale ||
    techniciansQuery.server.isStale ||
    invoicesQuery.server.isStale ||
    (viewAudit && auditQuery.server.isStale);

  let syncLabel: string | null = null;
  if (syncing && !jobsQuery.server.isLoading) {
    syncLabel = "Updating…";
  } else if (stale && !syncing) {
    syncLabel = "Showing cached data";
  }

  return (
    <DashboardFrame organizationName={organizationName} syncLabel={syncLabel}>
      <KpiGrid>
        <KpiCard
          label="Open Jobs"
          href={JOBS_HREF}
          isLoading={jobsQuery.server.isLoading}
          isError={jobsQuery.server.isError}
          isFetching={
            jobsQuery.server.isFetching && !jobsQuery.server.isLoading
          }
          isStale={jobsQuery.server.isStale}
          count={jobsQuery.server.isSuccess ? openJobCount : null}
          emptyLabel={openJobEmpty}
          errorMessage={jobsQuery.server.error?.message ?? null}
          unauthorized={jobsQuery.server.error?.unauthorized ?? false}
          onRetry={() => void jobsQuery.refetch()}
        />
        <KpiCard
          label="Service Requests"
          href={SERVICE_REQUESTS_HREF}
          isLoading={requestsQuery.server.isLoading}
          isError={requestsQuery.server.isError}
          isFetching={
            requestsQuery.server.isFetching && !requestsQuery.server.isLoading
          }
          isStale={requestsQuery.server.isStale}
          count={requestsQuery.server.isSuccess ? requestCount : null}
          emptyLabel={requestEmpty}
          errorMessage={requestsQuery.server.error?.message ?? null}
          unauthorized={requestsQuery.server.error?.unauthorized ?? false}
          onRetry={() => void requestsQuery.refetch()}
        />
        <KpiCard
          label="Active Technicians"
          href={TECHNICIANS_HREF}
          isLoading={techniciansQuery.server.isLoading}
          isError={techniciansQuery.server.isError}
          isFetching={
            techniciansQuery.server.isFetching &&
            !techniciansQuery.server.isLoading
          }
          isStale={techniciansQuery.server.isStale}
          count={
            techniciansQuery.server.isSuccess ? activeTechnicianCount : null
          }
          emptyLabel={technicianEmpty}
          errorMessage={techniciansQuery.server.error?.message ?? null}
          unauthorized={techniciansQuery.server.error?.unauthorized ?? false}
          onRetry={() => void techniciansQuery.refetch()}
        />
        <KpiCard
          label="Pending Invoices"
          href={INVOICES_HREF}
          isLoading={invoicesQuery.server.isLoading}
          isError={invoicesQuery.server.isError}
          isFetching={
            invoicesQuery.server.isFetching && !invoicesQuery.server.isLoading
          }
          isStale={invoicesQuery.server.isStale}
          count={invoicesQuery.server.isSuccess ? pendingInvoiceCount : null}
          emptyLabel={invoiceEmpty}
          errorMessage={invoicesQuery.server.error?.message ?? null}
          unauthorized={invoicesQuery.server.error?.unauthorized ?? false}
          onRetry={() => void invoicesQuery.refetch()}
        />
      </KpiGrid>

      <BillingSection
        isLoading={invoicesQuery.server.isLoading}
        isError={invoicesQuery.server.isError}
        isFetching={
          invoicesQuery.server.isFetching && !invoicesQuery.server.isLoading
        }
        errorMessage={invoicesQuery.server.error?.message ?? null}
        unauthorized={invoicesQuery.server.error?.unauthorized ?? false}
        onRetry={() => void invoicesQuery.refetch()}
        outstandingAmount={outstandingAmount}
        paidAmount={paidAmount}
        currency={billingCurrency}
        recentPaidInvoices={recentPaidInvoices}
        timeZone={timeZone}
        hasInvoices={invoicesQuery.invoices.length > 0}
      />

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_ACTIONS.filter(
            (action) => !action.roles || action.roles.includes(role),
          ).map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={buttonVariants({ variant: "outline" })}
              >
                <Icon aria-hidden="true" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <ActivitySection
        viewAudit={viewAudit}
        jobs={jobsQuery.jobs}
        jobsServer={jobsQuery.server}
        onRetryJobs={() => void jobsQuery.refetch()}
        auditLogs={auditQuery.auditLogs}
        auditServer={auditQuery.server}
        auditForbidden={auditQuery.forbidden}
        onRetryAudit={() => void auditQuery.refetch()}
        timeZone={timeZone}
      />
    </DashboardFrame>
  );
}

function DashboardFrame({
  organizationName,
  syncLabel,
  children,
}: {
  organizationName: string | null;
  syncLabel: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organizationName
              ? `Operational overview for ${organizationName}.`
              : "Welcome to OpsPilot. Your operational overview will appear here."}
          </p>
        </div>
        {syncLabel ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {syncLabel}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

function KpiCard({
  label,
  href,
  isLoading,
  isError,
  isFetching,
  isStale,
  count,
  emptyLabel,
  errorMessage,
  unauthorized,
  onRetry,
}: {
  label: string;
  href: string;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isStale: boolean;
  count: number | null;
  emptyLabel: string | null;
  errorMessage: string | null;
  unauthorized: boolean;
  onRetry: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {isFetching ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Syncing
          </span>
        ) : isStale && !isError && !isLoading ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Stale
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <>
          <div
            className="mt-2 h-9 w-16 animate-pulse rounded-md bg-muted"
            aria-hidden="true"
          />
          <span className="sr-only">Loading {label}</span>
        </>
      ) : null}
      {!isLoading && !isError && count !== null ? (
        <>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {count}
          </p>
          {emptyLabel ? (
            <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
          ) : null}
        </>
      ) : null}
      {isError ? (
        <>
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errorMessage ?? "The request failed."}
          </p>
          {unauthorized ? (
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            >
              Retry
            </button>
          )}
        </>
      ) : null}
    </>
  );

  if (isError) {
    return (
      <div className={cardClassName} aria-busy="false">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        cardClassName,
        "block transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-busy={isLoading || isFetching}
    >
      {content}
    </Link>
  );
}

function BillingSection({
  isLoading,
  isError,
  isFetching,
  errorMessage,
  unauthorized,
  onRetry,
  outstandingAmount,
  paidAmount,
  currency,
  recentPaidInvoices,
  timeZone,
  hasInvoices,
}: {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  unauthorized: boolean;
  onRetry: () => void;
  outstandingAmount: string;
  paidAmount: string;
  currency: string;
  recentPaidInvoices: Invoice[];
  timeZone: string;
  hasInvoices: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Billing</h2>
        <div className="flex items-center gap-3">
          {isFetching ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Syncing
            </span>
          ) : null}
          <Link
            href={INVOICES_HREF}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View invoices
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : null}

      {isError ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-destructive">
            {errorMessage ?? "Unable to load billing summary."}
          </p>
          {unauthorized ? (
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            >
              Retry
            </button>
          )}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Outstanding
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {formatMoney(outstandingAmount, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Paid
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {formatMoney(paidAmount, currency)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent payments
            </h3>
            {!hasInvoices ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No invoices yet.
              </p>
            ) : recentPaidInvoices.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No recorded payments yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {recentPaidInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(invoice.amountPaid, invoice.currency)} paid
                        ·{" "}
                        {formatDateTime(
                          invoice.paidAt ?? invoice.updatedAt,
                          timeZone,
                        )}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={invoice.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ActivitySection({
  viewAudit,
  jobs,
  jobsServer,
  onRetryJobs,
  auditLogs,
  auditServer,
  auditForbidden,
  onRetryAudit,
  timeZone,
}: {
  viewAudit: boolean;
  jobs: Job[];
  jobsServer: ServerQueryState<unknown>;
  onRetryJobs: () => void;
  auditLogs: AuditLog[];
  auditServer: ServerQueryState<unknown>;
  auditForbidden: boolean;
  onRetryAudit: () => void;
  timeZone: string;
}) {
  const usingAudit = viewAudit && !auditForbidden;

  let body: ReactNode;
  if (usingAudit) {
    if (auditServer.isLoading) {
      body = <ActivitySkeleton />;
    } else if (auditServer.isError) {
      body = (
        <ActivityError
          message={auditServer.error?.message ?? "The request failed."}
          unauthorized={auditServer.error?.unauthorized ?? false}
          onRetry={onRetryAudit}
        />
      );
    } else if (auditLogs.length === 0) {
      body = <ActivityEmpty />;
    } else {
      body = (
        <ActivityList items={recentAudit(auditLogs)} timeZone={timeZone} />
      );
    }
  } else if (jobsServer.isLoading) {
    body = <ActivitySkeleton />;
  } else if (jobsServer.isError) {
    body = (
      <ActivityError
        message={jobsServer.error?.message ?? "The request failed."}
        unauthorized={jobsServer.error?.unauthorized ?? false}
        onRetry={onRetryJobs}
      />
    );
  } else {
    const items = recentJobs(jobs);
    body =
      items.length === 0 ? (
        <ActivityEmpty />
      ) : (
        <ActivityList items={items} timeZone={timeZone} />
      );
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card p-6"
      aria-busy={
        (usingAudit && (auditServer.isLoading || auditServer.isFetching)) ||
        (!usingAudit && (jobsServer.isLoading || jobsServer.isFetching))
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Recent activity
        </h2>
        {(usingAudit ? auditServer.isFetching : jobsServer.isFetching) &&
        !(usingAudit ? auditServer.isLoading : jobsServer.isLoading) ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Syncing
          </span>
        ) : null}
      </div>
      {!usingAudit && jobsServer.isSuccess && jobs.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Showing recent jobs. Full history is available to owners and admins.
        </p>
      ) : null}
      <div className="mt-4">{body}</div>
    </section>
  );
}

function ActivitySkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-5 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading recent activity</span>
    </>
  );
}

function ActivityEmpty() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      No recent activity for this organization yet.
    </p>
  );
}

function ActivityError({
  message,
  unauthorized,
  onRetry,
}: {
  message: string;
  unauthorized: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="text-center">
      <p role="alert" className="text-sm text-destructive">
        {message}
      </p>
      {unauthorized ? (
        <Link
          href="/login"
          className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
        >
          Sign in
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function ActivityList({
  items,
  timeZone,
}: {
  items: ActivityItem[];
  timeZone: string;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          {item.href ? (
            <Link
              href={item.href}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {item.label}
            </span>
          )}
          <time
            dateTime={item.at}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatTimestamp(item.at, timeZone)}
          </time>
        </li>
      ))}
    </ul>
  );
}
