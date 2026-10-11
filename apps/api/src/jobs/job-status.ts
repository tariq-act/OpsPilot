import type { JobStatus } from '../db/schema/job.js';

/**
 * Allowed job status moves.
 * Execution path: CONFIRMED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED.
 * Terminal: COMPLETED, CANCELLED.
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Statuses set during field execution (not via generic job update). */
export const EXECUTION_PROGRESS_STATUSES = [
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
] as const satisfies readonly JobStatus[];

export type ExecutionProgressStatus =
  (typeof EXECUTION_PROGRESS_STATUSES)[number];

export function canTransitionJobStatus(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isExecutionProgressStatus(
  status: JobStatus,
): status is ExecutionProgressStatus {
  return (EXECUTION_PROGRESS_STATUSES as readonly string[]).includes(status);
}
