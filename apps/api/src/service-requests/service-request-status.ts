import type { ServiceRequestStatus } from '../db/schema/service-request.js';

/**
 * Allowed status moves for a service request.
 * Terminal: REJECTED, CANCELLED. ACCEPTED may only be cancelled.
 */
const ALLOWED_TRANSITIONS: Record<
  ServiceRequestStatus,
  readonly ServiceRequestStatus[]
> = {
  NEW: ['IN_REVIEW', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  IN_REVIEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransitionServiceRequestStatus(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
