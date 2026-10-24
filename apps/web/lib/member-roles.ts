import type { MemberRole } from "@/lib/types";

const JOB_MANAGER_ROLES: readonly MemberRole[] = [
  "OWNER",
  "ADMIN",
  "DISPATCHER",
];

export function isJobManagerRole(role: MemberRole | null | undefined): boolean {
  if (!role) return false;
  return (JOB_MANAGER_ROLES as readonly string[]).includes(role);
}

export function isTechnicianRole(role: MemberRole | null | undefined): boolean {
  return role === "TECHNICIAN";
}

/** Mirrors invoice/payment manager roles on the API. */
export function isInvoiceManagerRole(
  role: MemberRole | null | undefined,
): boolean {
  return isJobManagerRole(role);
}

/** Mirrors notification viewer / follow-up manager roles on the API. */
export function isNotificationManagerRole(
  role: MemberRole | null | undefined,
): boolean {
  return isJobManagerRole(role);
}

export function isFollowUpManagerRole(
  role: MemberRole | null | undefined,
): boolean {
  return isJobManagerRole(role);
}

/** Mirrors analytics manager roles on the API (includes financial metrics). */
export function isAnalyticsManagerRole(
  role: MemberRole | null | undefined,
): boolean {
  return isJobManagerRole(role);
}
