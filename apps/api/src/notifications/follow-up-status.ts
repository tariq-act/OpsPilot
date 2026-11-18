/**
 * Allowed customer follow-up status transitions.
 * Terminal states (COMPLETED, CANCELLED) cannot move back to open states.
 */
const ALLOWED_TRANSITIONS: Record<
  'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED',
  readonly ('PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED')[]
> = {
  PENDING: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
  SCHEDULED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export type FollowUpStatusName = keyof typeof ALLOWED_TRANSITIONS;

export function canTransitionFollowUpStatus(
  from: FollowUpStatusName,
  to: FollowUpStatusName,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
