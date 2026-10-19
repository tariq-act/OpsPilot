import type { InvoiceStatus } from "@/lib/types";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

export const VOIDABLE_INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "OVERDUE",
  "PARTIALLY_PAID",
] as const satisfies readonly InvoiceStatus[];

export function canVoidInvoice(status: InvoiceStatus): boolean {
  return (VOIDABLE_INVOICE_STATUSES as readonly string[]).includes(status);
}

export function canSendInvoice(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

export function canEditInvoice(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

export function canRecordPayment(status: InvoiceStatus): boolean {
  return (
    status === "SENT" ||
    status === "OVERDUE" ||
    status === "PARTIALLY_PAID"
  );
}

export const PENDING_INVOICE_STATUSES = new Set<InvoiceStatus>([
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "OVERDUE",
]);
