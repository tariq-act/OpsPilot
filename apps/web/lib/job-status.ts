import type { JobPriority, JobStatus } from "@/lib/types";

/**
 * Mirrors apps/api/src/jobs/job-status.ts so the UI only offers
 * transitions the backend accepts. Execution moves use dedicated
 * endpoints (schedule / progress / complete), not generic PATCH.
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const EXECUTION_PROGRESS_STATUSES = [
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
] as const satisfies readonly JobStatus[];

export type ExecutionProgressStatus =
  (typeof EXECUTION_PROGRESS_STATUSES)[number];

export function getAllowedJobTransitions(
  from: JobStatus,
): readonly JobStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function canTransitionJobStatus(
  from: JobStatus,
  to: JobStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isExecutionProgressStatus(
  status: JobStatus,
): status is ExecutionProgressStatus {
  return (EXECUTION_PROGRESS_STATUSES as readonly string[]).includes(status);
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  EN_ROUTE: "En route",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const JOB_PRIORITY_LABEL: Record<JobPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

/** Primary next action label for the current status (non-cancel). */
export function getPrimaryJobActionLabel(
  status: JobStatus,
): string | null {
  switch (status) {
    case "DRAFT":
      return "Schedule job";
    case "CONFIRMED":
      return "Mark en route";
    case "EN_ROUTE":
      return "Mark arrived";
    case "ARRIVED":
      return "Start work";
    case "IN_PROGRESS":
      return "Complete job";
    default:
      return null;
  }
}
