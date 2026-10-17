"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { useOrg } from "@/components/providers/org-provider";
import {
  ServiceRequestPriorityBadge,
  ServiceRequestStatusBadge,
} from "@/components/service-requests/request-badges";
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
  formatDate,
  formatDateTime,
  shortId,
} from "@/lib/format";
import { useAuditLogsQuery } from "@/lib/query/audit-logs";
import { useCustomerQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useJobsQuery } from "@/lib/query/jobs";
import {
  useCancelServiceRequestMutation,
  useServiceRequestQuery,
  useUpdateServiceRequestMutation,
} from "@/lib/query/service-requests";
import {
  getAllowedServiceRequestTransitions,
  SERVICE_REQUEST_SOURCE_LABEL,
  SERVICE_REQUEST_STATUS_LABEL,
} from "@/lib/service-request-status";
import { cn } from "@/lib/utils";
import type { ServiceRequestStatus } from "@/lib/types";

const ACTION_LABEL: Partial<Record<ServiceRequestStatus, string>> = {
  IN_REVIEW: "Mark in review",
  ACCEPTED: "Accept",
  REJECTED: "Reject",
  CANCELLED: "Cancel request",
};

function auditLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function ServiceRequestDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canViewAudit = current?.role === "OWNER" || current?.role === "ADMIN";

  const detailQuery = useServiceRequestQuery(organizationId, id);
  const request = detailQuery.serviceRequest;
  const customerQuery = useCustomerQuery(
    organizationId,
    request?.customerId ?? "",
  );
  const jobsQuery = useJobsQuery(organizationId, { requestId: id });
  const auditQuery = useAuditLogsQuery(organizationId, 20, canViewAudit, {
    entityType: "SERVICE_REQUEST",
    entityId: id,
  });

  const updateMutation = useUpdateServiceRequestMutation(organizationId);
  const cancelMutation = useCancelServiceRequestMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const pending = updateMutation.isPending || cancelMutation.isPending;
  const transitions = request
    ? getAllowedServiceRequestTransitions(request.status)
    : [];

  async function runTransition(next: ServiceRequestStatus) {
    if (next === "CANCELLED") {
      setCancelOpen(true);
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    try {
      await updateMutation.mutateAsync({ id, body: { status: next } });
      setActionSuccess(
        `Status updated to ${SERVICE_REQUEST_STATUS_LABEL[next]}.`,
      );
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to update this request."),
      );
    }
  }

  async function confirmCancel() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await cancelMutation.mutateAsync(id);
      setCancelOpen(false);
      setActionSuccess("Request cancelled.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to cancel this request."),
      );
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Service Request" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Service Request" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isError || !request) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/service-requests"
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
            {detailQuery.server.error?.message ?? "Service request not found."}
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

  const customer = customerQuery.customer;
  const address = customer ? formatCustomerAddress(customer) : null;
  const relatedJob = jobsQuery.jobs[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/service-requests"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to list
        </Link>
        <PageHeader
          title={request.title}
          description={`Request ${shortId(request.id)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => (
                <Button
                  key={next}
                  type="button"
                  variant={
                    next === "CANCELLED" || next === "REJECTED"
                      ? "outline"
                      : "default"
                  }
                  disabled={pending}
                  onClick={() => void runTransition(next)}
                >
                  {ACTION_LABEL[next] ?? SERVICE_REQUEST_STATUS_LABEL[next]}
                </Button>
              ))}
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

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (cancelMutation.isPending) return;
          setCancelOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription>
              This marks the request as cancelled. You cannot undo this from the
              current status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep request
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmCancel()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Request</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <ServiceRequestStatusBadge status={request.status} />
            </Field>
            <Field label="Priority">
              <ServiceRequestPriorityBadge priority={request.priority} />
            </Field>
            <Field label="Source">
              {SERVICE_REQUEST_SOURCE_LABEL[request.source]}
            </Field>
            <Field label="Preferred schedule">
              {[
                formatDate(request.preferredDate, timeZone),
                request.preferredTime,
              ]
                .filter((part) => part && part !== "—")
                .join(" · ") || "—"}
            </Field>
            <Field label="Created">
              {formatDateTime(request.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(request.updatedAt, timeZone)}
            </Field>
          </dl>
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {request.description?.trim() || "No description provided."}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Customer</h2>
          {customerQuery.server.isLoading ? (
            <div className="mt-4 h-24 animate-pulse rounded-md bg-muted" />
          ) : customer ? (
            <dl className="mt-4 flex flex-col gap-3">
              <Field label="Name">{customer.name}</Field>
              <Field label="Phone">{customer.phone}</Field>
              <Field label="Email">{customer.email ?? "—"}</Field>
              <Field label="Address">{address ?? "—"}</Field>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Customer {shortId(request.customerId)}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Related job</h2>
        {jobsQuery.server.isLoading ? (
          <div className="mt-4 h-10 animate-pulse rounded-md bg-muted" />
        ) : relatedJob ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {relatedJob.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {shortId(relatedJob.id)} ·{" "}
                {relatedJob.status.replaceAll("_", " ")}
              </p>
            </div>
            <Link
              href={`/dashboard/jobs/${relatedJob.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              title={relatedJob.id}
            >
              View job {shortId(relatedJob.id)}
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No job has been created from this request yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        {!canViewAudit ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Request history is available to owners and admins.
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
            No recorded activity for this request yet.
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
