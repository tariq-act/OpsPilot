import type { Invoice, InvoiceStatus } from '../db/schema/invoice.js';
import { centsToMoneyString, parseMoneyToCents } from './money.js';

export type InvoiceBalanceUpdate = {
  amountPaid: string;
  amountDue: string;
  status: InvoiceStatus;
  paidAt: Date | null;
};

/**
 * Derive invoice balance fields after succeeded payments change.
 * Does not mutate VOID or DRAFT invoices (callers must reject those).
 */
export function deriveInvoiceBalanceAfterPayment(input: {
  invoice: Invoice;
  /** Net succeeded payment total for the invoice (after refunds). */
  succeededPaidCents: bigint;
  now?: Date;
}): InvoiceBalanceUpdate {
  const totalCents = parseMoneyToCents(input.invoice.total, 'total');
  if (input.succeededPaidCents < 0n) {
    throw new Error('amountPaid must be non-negative');
  }
  if (input.succeededPaidCents > totalCents) {
    throw new Error('amountPaid cannot exceed total');
  }

  const amountDueCents = totalCents - input.succeededPaidCents;
  const amountPaid = centsToMoneyString(input.succeededPaidCents);
  const amountDue = centsToMoneyString(amountDueCents);
  const now = input.now ?? new Date();

  let status: InvoiceStatus;
  let paidAt: Date | null = input.invoice.paidAt;

  if (input.succeededPaidCents === 0n) {
    paidAt = null;
    if (
      input.invoice.dueAt &&
      input.invoice.dueAt.getTime() < now.getTime()
    ) {
      status = 'OVERDUE';
    } else {
      status = 'SENT';
    }
  } else if (amountDueCents === 0n) {
    status = 'PAID';
    paidAt = input.invoice.paidAt ?? now;
  } else {
    status = 'PARTIALLY_PAID';
    paidAt = null;
  }

  return { amountPaid, amountDue, status, paidAt };
}

/** Statuses that may accept a new SUCCEEDED payment. */
export const PAYABLE_INVOICE_STATUSES = [
  'SENT',
  'OVERDUE',
  'PARTIALLY_PAID',
] as const satisfies readonly InvoiceStatus[];

export function isPayableInvoiceStatus(
  status: InvoiceStatus,
): status is (typeof PAYABLE_INVOICE_STATUSES)[number] {
  return (PAYABLE_INVOICE_STATUSES as readonly string[]).includes(status);
}
