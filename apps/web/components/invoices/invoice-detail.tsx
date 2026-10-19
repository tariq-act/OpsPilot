"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
} from "@/components/invoices/invoice-badges";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatMoney, shortId } from "@/lib/format";
import { INVOICE_ITEM_TYPE_LABEL } from "@/lib/invoice-item-type";
import {
  canRecordPayment,
  canSendInvoice,
  canVoidInvoice,
} from "@/lib/invoice-status";
import { isInvoiceManagerRole } from "@/lib/member-roles";
import { PAYMENT_METHOD_LABEL } from "@/lib/payment-labels";
import { useCustomerQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useInvoicePaymentsQuery,
  useInvoiceQuery,
  useSendInvoiceMutation,
  useVoidInvoiceMutation,
} from "@/lib/query/invoices";
import { useJobQuery } from "@/lib/query/jobs";
import { cn } from "@/lib/utils";

export function InvoiceDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isInvoiceManagerRole(current?.role);

  const detailQuery = useInvoiceQuery(organizationId, id);
  const invoice = detailQuery.invoice;
  const paymentsQuery = useInvoicePaymentsQuery(organizationId, id);
  const customerQuery = useCustomerQuery(
    organizationId,
    invoice?.customerId ?? "",
  );
  const jobQuery = useJobQuery(organizationId, invoice?.jobId ?? "");

  const sendMutation = useSendInvoiceMutation(organizationId);
  const voidMutation = useVoidInvoiceMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const pending = sendMutation.isPending || voidMutation.isPending;

  async function confirmSend() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await sendMutation.mutateAsync(id);
      setSendOpen(false);
      setActionSuccess("Invoice sent.");
    } catch (error) {
      setActionError(toUserErrorMessage(error, "Unable to send the invoice."));
      setSendOpen(false);
    }
  }

  async function confirmVoid() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await voidMutation.mutateAsync(id);
      setVoidOpen(false);
      setActionSuccess("Invoice voided.");
    } catch (error) {
      setActionError(toUserErrorMessage(error, "Unable to void the invoice."));
      setVoidOpen(false);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Invoice" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Invoice" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.server.isError || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/invoices"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to invoices
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {detailQuery.server.error?.message ?? "Invoice not found."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:underline"
            onClick={() => void detailQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const customer = customerQuery.customer;
  const job = jobQuery.job;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/invoices"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to invoices
        </Link>
        <PageHeader
          title={invoice.invoiceNumber}
          description={`Invoice ${shortId(invoice.id)}`}
          actions={
            canManage ? (
              <div className="flex flex-wrap gap-2">
                {canSendInvoice(invoice.status) ? (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => setSendOpen(true)}
                  >
                    Send invoice
                  </Button>
                ) : null}
                {canRecordPayment(invoice.status) ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setPaymentOpen(true)}
                  >
                    Record payment
                  </Button>
                ) : null}
                {canVoidInvoice(invoice.status) ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setVoidOpen(true)}
                  >
                    Void invoice
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="text-sm text-foreground" aria-live="polite">
          {actionSuccess}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <span className="text-sm text-muted-foreground">
              {invoice.currency}
            </span>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Total">
              {formatMoney(invoice.total, invoice.currency)}
            </Field>
            <Field label="Amount due">
              {formatMoney(invoice.amountDue, invoice.currency)}
            </Field>
            <Field label="Amount paid">
              {formatMoney(invoice.amountPaid, invoice.currency)}
            </Field>
            <Field label="Due date">
              {formatDate(invoice.dueAt, timeZone)}
            </Field>
            <Field label="Issued">
              {formatDateTime(invoice.issuedAt, timeZone)}
            </Field>
            <Field label="Paid at">
              {formatDateTime(invoice.paidAt, timeZone)}
            </Field>
            <Field label="Created">
              {formatDateTime(invoice.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(invoice.updatedAt, timeZone)}
            </Field>
          </dl>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            {customerQuery.server.isLoading ? (
              <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
            ) : customer ? (
              <dl className="mt-4 flex flex-col gap-3">
                <Field label="Name">{customer.name}</Field>
                <Field label="Phone">{customer.phone}</Field>
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Open customer
                </Link>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {shortId(invoice.customerId)}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Job</h2>
            {jobQuery.server.isLoading ? (
              <div className="mt-4 h-10 animate-pulse rounded-md bg-muted" />
            ) : job ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  {job.title}
                </p>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Open job
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {shortId(invoice.jobId)}
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Line items</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{INVOICE_ITEM_TYPE_LABEL[item.type]}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {formatMoney(item.unitPrice, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    {formatMoney(item.amount, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <dl className="mt-4 ml-auto grid max-w-sm gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatMoney(invoice.subtotal, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>{formatMoney(invoice.discount, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{formatMoney(invoice.tax, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(invoice.total, invoice.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Payment history
          </h2>
          {canManage && canRecordPayment(invoice.status) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPaymentOpen(true)}
            >
              Record payment
            </Button>
          ) : null}
        </div>
        {paymentsQuery.server.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
        ) : paymentsQuery.server.isError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {paymentsQuery.server.error?.message ??
              "Unable to load payments."}
          </p>
        ) : paymentsQuery.payments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {paymentsQuery.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatMoney(payment.amount, payment.currency)} ·{" "}
                    {PAYMENT_METHOD_LABEL[payment.method]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(payment.paidAt ?? payment.createdAt, timeZone)}
                    {payment.transactionId
                      ? ` · Ref ${payment.transactionId}`
                      : ""}
                  </p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        organizationId={organizationId}
        invoice={invoice}
        onSuccess={(message) => setActionSuccess(message)}
      />

      <Dialog
        open={sendOpen}
        onOpenChange={(open) => {
          if (sendMutation.isPending) return;
          setSendOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send this invoice?</DialogTitle>
            <DialogDescription>
              This marks the invoice as sent and sets the issued date. Draft
              edits will no longer be allowed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendOpen(false)}
              disabled={sendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSend()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Sending…" : "Send invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={voidOpen}
        onOpenChange={(open) => {
          if (voidMutation.isPending) return;
          setVoidOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void this invoice?</DialogTitle>
            <DialogDescription>
              This soft-cancels the invoice. Paid invoices cannot be voided.
              History is retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoidOpen(false)}
              disabled={voidMutation.isPending}
            >
              Keep invoice
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmVoid()}
              disabled={voidMutation.isPending}
            >
              {voidMutation.isPending ? "Voiding…" : "Void invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
