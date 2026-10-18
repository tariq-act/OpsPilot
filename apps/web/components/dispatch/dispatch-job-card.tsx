"use client";

import Link from "next/link";

import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-badges";
import { Button } from "@/components/ui/button";
import { formatTimeRange } from "@/lib/dispatch-date";
import { getPrimaryJobActionLabel } from "@/lib/job-status";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

type DispatchJobCardProps = {
  job: Job;
  customerName: string;
  technicianLabel?: string | null;
  timeZone: string;
  hasConflict?: boolean;
  onAssign?: () => void;
  onSchedule?: () => void;
  onStatusAction?: () => void;
  statusPending?: boolean;
};

export function DispatchJobCard({
  job,
  customerName,
  technicianLabel,
  timeZone,
  hasConflict = false,
  onAssign,
  onSchedule,
  onStatusAction,
  statusPending = false,
}: DispatchJobCardProps) {
  const primaryLabel = getPrimaryJobActionLabel(job.status);
  const canManageAssignment =
    job.status !== "COMPLETED" && job.status !== "CANCELLED";
  const canSchedule =
    job.status === "DRAFT" ||
    (job.status !== "COMPLETED" && job.status !== "CANCELLED");

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm",
        hasConflict
          ? "border-status-overdue-border bg-status-overdue/10"
          : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {customerName}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <JobStatusBadge status={job.status} />
          <JobPriorityBadge priority={job.priority} />
        </div>
      </div>

      <dl className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>Window</dt>
          <dd className="text-right text-foreground">
            {formatTimeRange(job.scheduledStart, job.scheduledEnd, timeZone)}
          </dd>
        </div>
        {technicianLabel ? (
          <div className="flex justify-between gap-2">
            <dt>Technician</dt>
            <dd className="truncate text-right text-foreground">
              {technicianLabel}
            </dd>
          </div>
        ) : null}
        {hasConflict ? (
          <p className="pt-1 font-medium text-status-overdue-foreground">
            Schedule conflict
          </p>
        ) : null}
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {primaryLabel && onStatusAction ? (
          <Button
            type="button"
            size="sm"
            disabled={statusPending}
            onClick={onStatusAction}
          >
            {primaryLabel}
          </Button>
        ) : null}
        {canSchedule && onSchedule ? (
          <Button type="button" size="sm" variant="outline" onClick={onSchedule}>
            {job.status === "DRAFT" ? "Schedule" : "Reschedule"}
          </Button>
        ) : null}
        {canManageAssignment && onAssign ? (
          <Button type="button" size="sm" variant="outline" onClick={onAssign}>
            {technicianLabel ? "Reassign" : "Assign"}
          </Button>
        ) : null}
        <Link
          href={`/dashboard/jobs/${job.id}`}
          className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-primary hover:underline"
        >
          Details
        </Link>
      </div>
    </article>
  );
}
