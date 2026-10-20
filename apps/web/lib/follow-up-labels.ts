import type { FollowUpStatus, FollowUpType } from "@/lib/types";

export const FOLLOW_UP_TYPE_LABEL: Record<FollowUpType, string> = {
  FEEDBACK: "Feedback",
  MAINTENANCE_REMINDER: "Maintenance reminder",
};

export const FOLLOW_UP_STATUS_LABEL: Record<FollowUpStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const FOLLOW_UP_TYPES = Object.keys(
  FOLLOW_UP_TYPE_LABEL,
) as FollowUpType[];

export const FOLLOW_UP_STATUSES = Object.keys(
  FOLLOW_UP_STATUS_LABEL,
) as FollowUpStatus[];

export function canCompleteFollowUp(status: FollowUpStatus): boolean {
  return status === "PENDING" || status === "SCHEDULED";
}

export function canCancelFollowUp(status: FollowUpStatus): boolean {
  return status === "PENDING" || status === "SCHEDULED";
}

export function canEditFollowUp(status: FollowUpStatus): boolean {
  return status === "PENDING" || status === "SCHEDULED";
}
