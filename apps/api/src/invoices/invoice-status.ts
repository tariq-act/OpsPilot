import type { InvoiceStatus } from '../db/schema/invoice.js';

/**
 * Allowed invoice status moves for API actions.
 * Payment-driven moves (PARTIALLY_PAID / PAID) are reserved for a later payments feature.
 * OVERDUE is applied lazily when a SENT invoice is past dueAt.
 */
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['SENT', 'VOID'],
  SENT: ['OVERDUE', 'PARTIALLY_PAID', 'PAID', 'VOID'],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'VOID'],
  PARTIALLY_PAID: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
};

/** Statuses that may still be voided (financial history preserved). */
export const VOIDABLE_STATUSES = [
  'DRAFT',
  'SENT',
  'OVERDUE',
  'PARTIALLY_PAID',
] as const satisfies readonly InvoiceStatus[];

/** Statuses that must not be edited via PATCH. */
export const IMMUTABLE_STATUSES = [
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
] as const satisfies readonly InvoiceStatus[];

export function canTransitionInvoiceStatus(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isVoidableStatus(
  status: InvoiceStatus,
): status is (typeof VOIDABLE_STATUSES)[number] {
  return (VOIDABLE_STATUSES as readonly string[]).includes(status);
}

export function isImmutableStatus(
  status: InvoiceStatus,
): status is (typeof IMMUTABLE_STATUSES)[number] {
  return (IMMUTABLE_STATUSES as readonly string[]).includes(status);
}
