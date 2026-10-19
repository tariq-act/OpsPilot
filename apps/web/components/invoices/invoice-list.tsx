"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPlus, LuSearch } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-badges";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateParam,
  parseDateParam,
  toIsoDateEnd,
  toIsoDateStart,
} from "@/lib/dispatch-date";
import { formatDate, formatMoney, shortId } from "@/lib/format";
import { INVOICE_STATUS_LABEL } from "@/lib/invoice-status";
import { isInvoiceManagerRole } from "@/lib/member-roles";
import { useCustomersQuery } from "@/lib/query/customers";
import { useInvoicesQuery } from "@/lib/query/invoices";
import { useJobsQuery } from "@/lib/query/jobs";
import type { InvoiceStatus } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 20;

const STATUS_OPTIONS: InvoiceStatus[] = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
];

export function InvoiceList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? ALL) as
    | InvoiceStatus
    | typeof ALL;
  const customerId = searchParams.get("customerId") ?? ALL;
  const jobId = searchParams.get("jobId") ?? "";
  const fromDateParam = searchParams.get("fromDate") ?? "";
  const toDateParam = searchParams.get("toDate") ?? "";
  const search = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [searchDraft, setSearchDraft] = useState(search);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isInvoiceManagerRole(current?.role);

  const listQuery = useMemo(
    () => ({
      status: status === ALL ? undefined : status,
      customerId: customerId === ALL ? undefined : customerId,
      jobId: jobId || undefined,
    }),
    [status, customerId, jobId],
  );

  const invoicesQuery = useInvoicesQuery(organizationId, listQuery);
  const customersQuery = useCustomersQuery(organizationId);
  const jobsQuery = useJobsQuery(organizationId);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.customers]);

  const jobTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of jobsQuery.jobs) {
      map.set(job.id, job.title);
    }
    return map;
  }, [jobsQuery.jobs]);

  const fromIso = toIsoDateStart(parseDateParam(fromDateParam));
  const toIso = toIsoDateEnd(parseDateParam(toDateParam));

  let filtered = invoicesQuery.invoices;
  if (fromIso) {
    filtered = filtered.filter((invoice) => invoice.createdAt >= fromIso);
  }
  if (toIso) {
    filtered = filtered.filter((invoice) => invoice.createdAt <= toIso);
  }
  const needle = search.trim().toLowerCase();
  if (needle) {
    filtered = filtered.filter((invoice) => {
      const customerName = customerNameById.get(invoice.customerId) ?? "";
      const jobTitle = jobTitleById.get(invoice.jobId) ?? "";
      return (
        invoice.id.toLowerCase().includes(needle) ||
        invoice.invoiceNumber.toLowerCase().includes(needle) ||
        customerName.toLowerCase().includes(needle) ||
        jobTitle.toLowerCase().includes(needle) ||
        invoice.jobId.toLowerCase().includes(needle) ||
        invoice.customerId.toLowerCase().includes(needle)
      );
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function updateParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
    }
    if ("status" in patch || "q" in patch || "customerId" in patch) {
      next.delete("page");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Invoices" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Organization invoices and payment status."
        actions={
          canManage ? (
            <Link href="/dashboard/invoices/new" className={buttonVariants()}>
              <LuPlus aria-hidden="true" />
              Create invoice
            </Link>
          ) : null
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="invoice-search">Search</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LuSearch
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="invoice-search"
                  className="pl-9"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      updateParams({ q: searchDraft.trim() });
                    }
                  }}
                  placeholder="Invoice #, customer, or job"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateParams({ q: searchDraft.trim() })}
              >
                Search
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                updateParams({ status: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {INVOICE_STATUS_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select
              value={customerId}
              onValueChange={(value) =>
                updateParams({ customerId: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All customers</SelectItem>
                {customersQuery.customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>Created from</Label>
            <DatePicker
              value={parseDateParam(fromDateParam)}
              onChange={(date) =>
                updateParams({
                  fromDate: date ? formatDateParam(date) : "",
                  page: "",
                })
              }
              placeholder="Any date"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Created to</Label>
            <DatePicker
              value={parseDateParam(toDateParam)}
              onChange={(date) =>
                updateParams({
                  toDate: date ? formatDateParam(date) : "",
                  page: "",
                })
              }
              placeholder="Any date"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice-job-id">Job id</Label>
            <Input
              id="invoice-job-id"
              value={jobId}
              onChange={(event) =>
                updateParams({ jobId: event.target.value.trim(), page: "" })
              }
              placeholder="Optional job filter"
            />
          </div>
        </div>
      </div>

      {invoicesQuery.server.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : invoicesQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {invoicesQuery.server.error?.message ??
              "Unable to load invoices."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:underline"
            onClick={() => void invoicesQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">No invoices found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an invoice from a completed job to get started.
          </p>
          {canManage ? (
            <Link
              href="/dashboard/invoices/new"
              className={buttonVariants({ className: "mt-4" })}
            >
              Create invoice
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {shortId(invoice.id)}
                    </p>
                  </TableCell>
                  <TableCell>
                    {customerNameById.get(invoice.customerId) ??
                      shortId(invoice.customerId)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/jobs/${invoice.jobId}`}
                      className="text-sm hover:text-primary"
                    >
                      {jobTitleById.get(invoice.jobId) ??
                        shortId(invoice.jobId)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatMoney(invoice.total, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    {formatDate(invoice.dueAt, timeZone)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    {formatDate(invoice.createdAt, timeZone)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() =>
                    updateParams({ page: String(safePage - 1) })
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    updateParams({ page: String(safePage + 1) })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
