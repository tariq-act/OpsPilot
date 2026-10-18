"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-badges";
import { useOrg } from "@/components/providers/org-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  formatTimeRange,
  toIsoDateEnd,
  toIsoDateStart,
  todayLocal,
} from "@/lib/dispatch-date";
import { formatDateTime, shortId } from "@/lib/format";
import {
  getPrimaryExecutionActionLabel,
} from "@/lib/job-status";
import { useCustomersQuery } from "@/lib/query/customers";
import { useJobsQuery } from "@/lib/query/jobs";
import { useServiceRequestsQuery } from "@/lib/query/service-requests";
import { cn } from "@/lib/utils";
import type { Job, JobStatus } from "@/lib/types";

const OPEN_STATUSES = new Set<JobStatus>([
  "CONFIRMED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
]);

export function MyWorkList() {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const today = todayLocal();

  const allJobsQuery = useJobsQuery(organizationId);
  const todayJobsQuery = useJobsQuery(organizationId, {
    fromDate: toIsoDateStart(today),
    toDate: toIsoDateEnd(today),
  });
  const customersQuery = useCustomersQuery(organizationId);
  const requestsQuery = useServiceRequestsQuery(organizationId);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.customers]);

  const requestTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const request of requestsQuery.serviceRequests) {
      map.set(request.id, request.title);
    }
    return map;
  }, [requestsQuery.serviceRequests]);

  const todayIds = useMemo(
    () => new Set(todayJobsQuery.jobs.map((job) => job.id)),
    [todayJobsQuery.jobs],
  );

  const todayOpen = useMemo(
    () =>
      todayJobsQuery.jobs
        .filter((job) => OPEN_STATUSES.has(job.status))
        .sort(sortByScheduledStart),
    [todayJobsQuery.jobs],
  );

  const upcomingOpen = useMemo(
    () =>
      allJobsQuery.jobs
        .filter(
          (job) => OPEN_STATUSES.has(job.status) && !todayIds.has(job.id),
        )
        .sort(sortByScheduledStart),
    [allJobsQuery.jobs, todayIds],
  );

  const recentClosed = useMemo(
    () =>
      allJobsQuery.jobs
        .filter(
          (job) => job.status === "COMPLETED" || job.status === "CANCELLED",
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 8),
    [allJobsQuery.jobs],
  );

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="My work" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const loading =
    allJobsQuery.server.isLoading || todayJobsQuery.server.isLoading;
  const error = allJobsQuery.server.isError || todayJobsQuery.server.isError;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My work"
        description="Your assigned jobs for field execution."
      />

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {allJobsQuery.server.error?.message ??
              todayJobsQuery.server.error?.message ??
              "Unable to load your jobs."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => {
              void allJobsQuery.refetch();
              void todayJobsQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <JobSection
            title="Today"
            empty="No jobs scheduled for you today."
            jobs={todayOpen}
            customerNameById={customerNameById}
            requestTitleById={requestTitleById}
            timeZone={timeZone}
            emphasize
          />
          <JobSection
            title="Other open jobs"
            empty="No other open assignments."
            jobs={upcomingOpen}
            customerNameById={customerNameById}
            requestTitleById={requestTitleById}
            timeZone={timeZone}
          />
          <JobSection
            title="Recently closed"
            empty="No completed or cancelled jobs yet."
            jobs={recentClosed}
            customerNameById={customerNameById}
            requestTitleById={requestTitleById}
            timeZone={timeZone}
          />
        </>
      )}
    </div>
  );
}

function JobSection({
  title,
  empty,
  jobs,
  customerNameById,
  requestTitleById,
  timeZone,
  emphasize = false,
}: {
  title: string;
  empty: string;
  jobs: Job[];
  customerNameById: Map<string, string>;
  requestTitleById: Map<string, string>;
  timeZone: string;
  emphasize?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5",
        emphasize ? "border-primary/30" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {jobs.length} job{jobs.length === 1 ? "" : "s"}
        </span>
      </div>
      {jobs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {jobs.map((job) => {
            const nextLabel = getPrimaryExecutionActionLabel(job.status);
            return (
              <li
                key={job.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {job.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {customerNameById.get(job.customerId) ??
                        `Customer ${shortId(job.customerId)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <JobStatusBadge status={job.status} />
                    <JobPriorityBadge priority={job.priority} />
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="font-medium">Window</dt>
                    <dd className="text-foreground">
                      {job.scheduledStart
                        ? formatTimeRange(
                            job.scheduledStart,
                            job.scheduledEnd,
                            timeZone,
                          )
                        : formatDateTime(job.scheduledStart, timeZone)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Location</dt>
                    <dd className="text-foreground">{job.location ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium">Service request</dt>
                    <dd className="text-foreground">
                      {requestTitleById.get(job.requestId) ??
                        shortId(job.requestId)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/my-work/${job.id}`}
                    className={buttonVariants({
                      size: "default",
                    })}
                  >
                    {nextLabel ? `Open · ${nextLabel}` : "Open job"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function sortByScheduledStart(a: Job, b: Job): number {
  return (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "");
}
