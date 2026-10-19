import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_LABEL } from "@/lib/invoice-status";
import { PAYMENT_STATUS_LABEL } from "@/lib/payment-labels";
import { cn } from "@/lib/utils";
import type { InvoiceStatus, PaymentStatus } from "@/lib/types";

const invoiceStatusClassName: Record<InvoiceStatus, string> = {
  DRAFT: "border-status-new-border bg-status-new text-status-new-foreground",
  SENT: "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  PARTIALLY_PAID:
    "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  PAID: "border-status-completed-border bg-status-completed text-status-completed-foreground",
  OVERDUE:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
  VOID: "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
};

const paymentStatusClassName: Record<PaymentStatus, string> = {
  PENDING:
    "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  SUCCEEDED:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  FAILED:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
  REFUNDED:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="ghost" className={cn(invoiceStatusClassName[status])}>
      {INVOICE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="ghost" className={cn(paymentStatusClassName[status])}>
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
