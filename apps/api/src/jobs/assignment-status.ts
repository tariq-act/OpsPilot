import type { JobAssignmentStatus } from '../db/schema/job-assignment.js';

/**
 * Allowed assignment status moves.
 * Terminal: RELEASED, CANCELLED.
 */
const ALLOWED_TRANSITIONS: Record<
  JobAssignmentStatus,
  readonly JobAssignmentStatus[]
> = {
  ASSIGNED: ['RELEASED', 'CANCELLED'],
  RELEASED: [],
  CANCELLED: [],
};

export function canTransitionAssignmentStatus(
  from: JobAssignmentStatus,
  to: JobAssignmentStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
