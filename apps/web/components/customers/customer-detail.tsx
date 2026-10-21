"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { CustomerStatusBadge } from "@/components/customers/customer-badges";
import { CustomerEditDialog } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { RelatedFollowUps } from "@/components/follow-ups/related-follow-ups";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-badges";
import { JobStatusBadge } from "@/components/jobs/job-badges";
import { useOrg } from "@/components/providers/org-provider";
import { ServiceRequestStatusBadge } from "@/components/service-requests/request-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCustomerAddress,
  formatDateTime,
  formatMoney,
  shortId,
  sumMoneyStrings,
} from "@/lib/format";
import { useAuditLogsQuery } from "@/lib/query/audit-logs";
import {
  useCustomerQuery,
  useDeactivateCustomerMutation,
} from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useInvoicesQuery } from "@/lib/query/invoices";
import { useJobsQuery } from "@/lib/query/jobs";
import { useServiceRequestsQuery } from "@/lib/query/service-requests";
import { cn } from "@/lib/utils";

function auditLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function CustomerDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canViewAudit = current?.role === "OWNER" || current?.role === "ADMIN";

  const detailQuery = useCustomerQuery(organizationId, id);
  const customer = detailQuery.customer;

  const requestsQuery = useServiceRequestsQuery(organizationId, {
    customerId: id,
  });
  const jobsQuery = useJobsQuery(organizationId, { customerId: id });
  const invoicesQuery = useInvoicesQuery(organizationId, { customerId: id });
  const auditQuery = useAuditLogsQuery(organizationId, 20, canViewAudit, {
    entityType: "CUSTOMER",
    entityId: id,
  });

  const deactivateMutation = useDeactivateCustomerMutation(organizationId);

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function confirmDeactivate() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await deactivateMutation.mutateAsync(id);
      setDeactivateOpen(false);
      setActionSuccess("Customer deactivated.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to deactivate this customer."),
      );
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Customer" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Customer" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isError || !customer) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/customers"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to list
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {detailQuery.server.error?.message ?? "Customer not found."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void detailQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const address = formatCustomerAddress(customer);
  const canDeactivate = customer.status === "ACTIVE";
  const outstandingAmount = sumMoneyStrings(
    invoicesQuery.invoices
      .filter((invoice) => invoice.status !== "VOID")
      .map((invoice) => invoice.amountDue),
  );
  const invoiceCurrency =
    invoicesQuery.invoices[0]?.currency ?? current.currency ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/customers"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to list
        </Link>
        <PageHeader
          title={customer.name}
          description={`Customer ${shortId(customer.id)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
                disabled={deactivateMutation.isPending}
              >
                Edit
              </Button>
              {canDeactivate ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeactivateOpen(true)}
                  disabled={deactivateMutation.isPending}
                >
                  Deactivate
                </Button>
              ) : null}
            </div>
          }
        />
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="text-sm text-foreground" aria-live="polite">
          {actionSuccess}
        </p>
      ) : null}

      <CustomerEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={() => setActionSuccess("Customer updated.")}
      />

      <Dialog
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (deactivateMutation.isPending) return;
          setDeactivateOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate this customer?</DialogTitle>
            <DialogDescription>
              This sets the customer status to inactive. The record is kept for
              history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateOpen(false)}
              disabled={deactivateMutation.isPending}
            >
              Keep active
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeactivate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending
                ? "Deactivating…"
                : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">
            Customer information
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <CustomerStatusBadge status={customer.status} />
            </Field>
            <Field label="Created">
              {formatDateTime(customer.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(customer.updatedAt, timeZone)}
            </Field>
            <Field label="Customer ID">
              <span className="font-mono text-xs">{customer.id}</span>
            </Field>
          </dl>
          {customer.notes ? (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {customer.notes}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Contact</h2>
          <dl className="mt-4 flex flex-col gap-3">
            <Field label="Phone">{customer.phone}</Field>
            <Field label="Email">{customer.email ?? "—"}</Field>
            <Field label="Address">{address ?? "—"}</Field>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Service requests
          </h2>
          <Link
            href={`/dashboard/service-requests?create=1`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            New request
          </Link>
        </div>
        {requestsQuery.server.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
        ) : requestsQuery.serviceRequests.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No service requests for this customer yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {requestsQuery.serviceRequests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/dashboard/service-requests/${request.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {request.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {shortId(request.id)} ·{" "}
                    {formatDateTime(request.createdAt, timeZone)}
                  </p>
                </div>
                <ServiceRequestStatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Jobs</h2>
          <Link
            href={`/dashboard/jobs?customerId=${encodeURIComponent(id)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View in jobs
          </Link>
        </div>
        {jobsQuery.server.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
        ) : jobsQuery.jobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No jobs for this customer yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {jobsQuery.jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {shortId(job.id)} ·{" "}
                    {formatDateTime(job.createdAt, timeZone)}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
            {!invoicesQuery.server.isLoading &&
            invoicesQuery.invoices.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Outstanding{" "}
                {formatMoney(outstandingAmount, invoiceCurrency)}
              </p>
            ) : null}
          </div>
          <Link
            href={`/dashboard/invoices?customerId=${encodeURIComponent(id)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View invoices
          </Link>
        </div>
        {invoicesQuery.server.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
        ) : invoicesQuery.server.isError ? (
          <div className="mt-4">
            <p role="alert" className="text-sm text-destructive">
              {invoicesQuery.server.error?.message ??
                "Unable to load invoices."}
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
              onClick={() => void invoicesQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : invoicesQuery.invoices.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No invoices for this customer yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {invoicesQuery.invoices.map((invoice) => (
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
                    {formatMoney(invoice.total, invoice.currency)} · due{" "}
                    {formatMoney(invoice.amountDue, invoice.currency)} ·{" "}
                    {formatDateTime(invoice.createdAt, timeZone)}
                  </p>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <RelatedFollowUps
        organizationId={organizationId}
        role={current.role}
        timeZone={timeZone}
        customerId={id}
      />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        {!canViewAudit ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Customer history is available to owners and admins.
          </p>
        ) : auditQuery.server.isLoading ? (
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : auditQuery.forbidden ? (
          <p className="mt-4 text-sm text-muted-foreground">
            You do not have access to audit history.
          </p>
        ) : auditQuery.auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No recorded activity for this customer yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {auditQuery.auditLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium text-foreground">
                  {auditLabel(log.action)}
                </span>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt, timeZone)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="h-64 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
