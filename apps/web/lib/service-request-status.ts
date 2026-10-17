import type { ServiceRequestStatus } from "@/lib/types";

/**
 * Mirrors apps/api/src/service-requests/service-request-status.ts
 * so the UI only offers transitions the backend accepts.
 */
const ALLOWED_TRANSITIONS: Record<
  ServiceRequestStatus,
  readonly ServiceRequestStatus[]
> = {
  NEW: ["IN_REVIEW", "ACCEPTED", "REJECTED", "CANCELLED"],
  IN_REVIEW: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
};

export function getAllowedServiceRequestTransitions(
  from: ServiceRequestStatus,
): readonly ServiceRequestStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function canTransitionServiceRequestStatus(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const SERVICE_REQUEST_STATUS_LABEL: Record<
  ServiceRequestStatus,
  string
> = {
  NEW: "New",
  IN_REVIEW: "In review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const SERVICE_REQUEST_PRIORITY_LABEL = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export const SERVICE_REQUEST_SOURCE_LABEL = {
  PHONE: "Phone",
  EMAIL: "Email",
  WEBSITE: "Website",
  WALK_IN: "Walk-in",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
} as const;
