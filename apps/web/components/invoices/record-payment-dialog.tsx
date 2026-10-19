"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import {
  ALL_PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/payment-labels";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useCreateInvoicePaymentMutation } from "@/lib/query/invoices";
import type { Invoice, PaymentMethod } from "@/lib/types";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  invoice: Invoice;
  onSuccess?: (message: string) => void;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  organizationId,
  invoice,
  onSuccess,
}: RecordPaymentDialogProps) {
  const createPayment = useCreateInvoicePaymentMutation(organizationId);
  const [amount, setAmount] = useState(invoice.amountDue);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAmount(invoice.amountDue);
    setMethod("CASH");
    setTransactionId("");
    setError(null);
  }

  async function submit() {
    setError(null);
    const trimmedAmount = amount.trim();
    if (!MONEY_PATTERN.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (Number(trimmedAmount) > Number(invoice.amountDue) + 1e-9) {
      setError(
        `Amount cannot exceed amount due (${formatMoney(invoice.amountDue, invoice.currency)}).`,
      );
      return;
    }

    try {
      await createPayment.mutateAsync({
        invoiceId: invoice.id,
        body: {
          amount: trimmedAmount,
          method,
          transactionId: transactionId.trim() || undefined,
          customerId: invoice.customerId,
        },
      });
      onOpenChange(false);
      reset();
      onSuccess?.(
        method === "ONLINE"
          ? "Online payment recorded as pending."
          : "Payment recorded.",
      );
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to record the payment."));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (createPayment.isPending) return;
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Amount due: {formatMoney(invoice.amountDue, invoice.currency)}.
            Manual methods succeed immediately. Online stays pending until a
            provider confirms.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={createPayment.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Method</Label>
            <Select
              value={method}
              onValueChange={(value) => setMethod(value as PaymentMethod)}
              disabled={createPayment.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PAYMENT_METHODS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {PAYMENT_METHOD_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-reference">Reference</Label>
            <Input
              id="payment-reference"
              value={transactionId}
              onChange={(event) => setTransactionId(event.target.value)}
              maxLength={128}
              placeholder="Optional transaction / reference id"
              disabled={createPayment.isPending}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPayment.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={createPayment.isPending}
          >
            {createPayment.isPending ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
