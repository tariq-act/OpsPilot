"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LuArrowLeft, LuPlus, LuTrash2 } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, shortId } from "@/lib/format";
import {
  INVOICE_ITEM_TYPE_LABEL,
  INVOICE_ITEM_TYPES,
} from "@/lib/invoice-item-type";
import { isInvoiceManagerRole } from "@/lib/member-roles";
import { useCustomersQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useCreateInvoiceMutation } from "@/lib/query/invoices";
import { useJobsQuery } from "@/lib/query/jobs";
import { cn } from "@/lib/utils";
import type { CreateInvoiceItemInput, InvoiceItemType, Job } from "@/lib/types";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

type LineDraft = CreateInvoiceItemInput & { key: string };

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    type: "LABOR",
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

function previewLineAmount(line: LineDraft): number {
  const qty = Number(line.quantity);
  const price = Number(line.unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return Math.round(qty * price * 100) / 100;
}

export function InvoiceCreateForm() {
  const { current } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = current?.id ?? "";
  const currency = current?.currency ?? "USD";
  const canManage = isInvoiceManagerRole(current?.role);

  const presetJobId = searchParams.get("jobId") ?? "";
  const presetCustomerId = searchParams.get("customerId") ?? "";

  const jobsQuery = useJobsQuery(organizationId, { status: "COMPLETED" });
  const customersQuery = useCustomersQuery(organizationId);
  const createMutation = useCreateInvoiceMutation(organizationId);

  const [jobId, setJobId] = useState<string | null>(presetJobId || null);
  const [customerId, setCustomerId] = useState<string | null>(
    presetCustomerId || null,
  );
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const completedJobs = jobsQuery.jobs;

  const selectedJob: Job | null =
    completedJobs.find((job) => job.id === jobId) ?? null;

  const invoicesForJobHint = useMemo(() => {
    if (!selectedJob) return null;
    return selectedJob;
  }, [selectedJob]);

  const previewSubtotal = lines.reduce(
    (sum, line) => sum + previewLineAmount(line),
    0,
  );
  const previewDiscount = Number(discount || "0");
  const previewTax = Number(tax || "0");
  const previewTotal =
    previewSubtotal -
    (Number.isFinite(previewDiscount) ? previewDiscount : 0) +
    (Number.isFinite(previewTax) ? previewTax : 0);

  function onJobChange(nextJobId: string | null) {
    setJobId(nextJobId);
    const job = completedJobs.find((row) => row.id === nextJobId);
    if (job) setCustomerId(job.customerId);
  }

  function validate(): string | null {
    if (!jobId) return "Select a completed job.";
    if (!customerId) return "Customer is required.";
    if (selectedJob && selectedJob.customerId !== customerId) {
      return "Customer must match the selected job.";
    }
    if (lines.length === 0) return "Add at least one line item.";
    for (const [index, line] of lines.entries()) {
      if (!line.description.trim()) {
        return `Line ${index + 1}: description is required.`;
      }
      if (!MONEY_PATTERN.test(line.quantity.trim())) {
        return `Line ${index + 1}: quantity must be a decimal with up to 2 places.`;
      }
      if (!MONEY_PATTERN.test(line.unitPrice.trim())) {
        return `Line ${index + 1}: unit price must be a decimal with up to 2 places.`;
      }
    }
    if (discount.trim() && !MONEY_PATTERN.test(discount.trim())) {
      return "Discount must be a decimal with up to 2 places.";
    }
    if (tax.trim() && !MONEY_PATTERN.test(tax.trim())) {
      return "Tax must be a decimal with up to 2 places.";
    }
    return null;
  }

  async function submit() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!jobId || !customerId) return;

    try {
      const result = await createMutation.mutateAsync({
        customerId,
        jobId,
        items: lines.map(({ type, description, quantity, unitPrice }) => ({
          type,
          description: description.trim(),
          quantity: quantity.trim(),
          unitPrice: unitPrice.trim(),
        })),
        discount: discount.trim() || undefined,
        tax: tax.trim() || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      router.push(`/dashboard/invoices/${result.invoice.id}`);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to create the invoice."));
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Create invoice" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Create invoice" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can create invoices.
        </p>
      </div>
    );
  }

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
          title="Create invoice"
          description="Draft invoices are created from completed jobs. Totals are calculated by the server."
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Job & customer</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Completed job</Label>
            <Select
              value={jobId}
              onValueChange={onJobChange}
              disabled={createMutation.isPending || jobsQuery.server.isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a completed job" />
              </SelectTrigger>
              <SelectContent>
                {completedJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} ({shortId(job.id)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {jobsQuery.server.isEmpty ? (
              <p className="text-xs text-muted-foreground">
                No completed jobs available. Complete a job first.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select
              value={customerId}
              onValueChange={setCustomerId}
              disabled={createMutation.isPending || Boolean(selectedJob)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customersQuery.customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invoicesForJobHint ? (
              <p className="text-xs text-muted-foreground">
                Customer is locked to the selected job.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Line items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={createMutation.isPending}
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <LuPlus aria-hidden="true" />
            Add line
          </Button>
        </div>

        <ul className="mt-4 flex flex-col gap-4">
          {lines.map((line, index) => (
            <li
              key={line.key}
              className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-12"
            >
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Type</Label>
                <Select
                  value={line.type}
                  onValueChange={(value) =>
                    setLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key
                          ? { ...row, type: value as InvoiceItemType }
                          : row,
                      ),
                    )
                  }
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_ITEM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {INVOICE_ITEM_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-4">
                <Label>Description</Label>
                <Input
                  value={line.description}
                  onChange={(event) =>
                    setLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key
                          ? { ...row, description: event.target.value }
                          : row,
                      ),
                    )
                  }
                  maxLength={500}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Qty</Label>
                <Input
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key
                          ? { ...row, quantity: event.target.value }
                          : row,
                      ),
                    )
                  }
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Unit price</Label>
                <Input
                  value={line.unitPrice}
                  onChange={(event) =>
                    setLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key
                          ? { ...row, unitPrice: event.target.value }
                          : row,
                      ),
                    )
                  }
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="flex items-end justify-between gap-2 sm:col-span-2">
                <div>
                  <p className="text-xs text-muted-foreground">Est. amount</p>
                  <p className="text-sm font-medium">
                    {formatMoney(
                      previewLineAmount(line).toFixed(2),
                      currency,
                    )}
                  </p>
                </div>
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={createMutation.isPending}
                    onClick={() =>
                      setLines((prev) =>
                        prev.filter((row) => row.key !== line.key),
                      )
                    }
                  >
                    <LuTrash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Adjustments & due date
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice-discount">Discount</Label>
            <Input
              id="invoice-discount"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              placeholder="0.00"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice-tax">Tax</Label>
            <Input
              id="invoice-tax"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
              placeholder="0.00"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Due date</Label>
            <DatePicker
              value={dueAt}
              onChange={setDueAt}
              disabled={createMutation.isPending}
              placeholder="Optional"
            />
          </div>
        </div>
        <dl className="mt-6 grid gap-2 text-sm sm:max-w-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Est. subtotal</dt>
            <dd>{formatMoney(previewSubtotal.toFixed(2), currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Est. total</dt>
            <dd className="font-semibold">
              {formatMoney(previewTotal.toFixed(2), currency)}
            </dd>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview only. The API recalculates and stores final totals.
          </p>
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating…" : "Create draft invoice"}
        </Button>
        <Link
          href="/dashboard/invoices"
          className={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
