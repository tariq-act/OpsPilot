"use client";

import { formatDateTime } from "@/lib/format";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import type { JobActivity, JobStatus } from "@/lib/types";

function activityLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

type JobActivityTimelineProps = {
  activities: JobActivity[];
  timeZone: string;
  actorNameById?: Map<string, string>;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  emptyMessage?: string;
};

export function JobActivityTimeline({
  activities,
  timeZone,
  actorNameById,
  isLoading = false,
  isError = false,
  errorMessage,
  emptyMessage = "No recorded activity for this job yet.",
}: JobActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-8 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        {errorMessage ?? "Activity history is unavailable."}
      </p>
    );
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {activityLabel(activity.action)}
              {activity.fromStatus && activity.toStatus
                ? ` (${JOB_STATUS_LABEL[activity.fromStatus as JobStatus]} → ${JOB_STATUS_LABEL[activity.toStatus as JobStatus]})`
                : null}
            </p>
            {activity.message ? (
              <p className="text-xs text-muted-foreground">{activity.message}</p>
            ) : null}
            {actorNameById?.get(activity.actorUserId) ? (
              <p className="text-xs text-muted-foreground">
                {actorNameById.get(activity.actorUserId)}
              </p>
            ) : null}
          </div>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatDateTime(activity.createdAt, timeZone)}
          </time>
        </li>
      ))}
    </ul>
  );
}
