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
