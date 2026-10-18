"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPlus, LuSearch } from "react-icons/lu";

import { CustomerStatusBadge } from "@/components/customers/customer-badges";
import { CustomerCreateDialog } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
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
import { CUSTOMER_STATUS_LABEL } from "@/lib/customer-status";
import { formatCustomerAddress, formatDate, shortId } from "@/lib/format";
import { useCustomersQuery } from "@/lib/query/customers";
import type { CustomerStatus } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 20;

const STATUS_OPTIONS: CustomerStatus[] = ["ACTIVE", "INACTIVE"];

export function CustomerList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? ALL) as
    | CustomerStatus
    | typeof ALL;
  const search = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const createOpen = searchParams.get("create") === "1";

  const [searchDraft, setSearchDraft] = useState(search);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";

  const customersQuery = useCustomersQuery(organizationId);

  const filtered = useMemo(() => {
    let rows = customersQuery.customers;
    if (status !== ALL) {
      rows = rows.filter((customer) => customer.status === status);
    }
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((customer) => {
      return (
        customer.id.toLowerCase().includes(needle) ||
        customer.name.toLowerCase().includes(needle) ||
        customer.phone.toLowerCase().includes(needle) ||
        (customer.email?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [customersQuery.customers, status, search]);

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
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function openCreateDialog() {
    updateParams({ create: "1" });
  }

  function handleCreateOpenChange(open: boolean) {
    updateParams({ create: open ? "1" : "" });
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Customers" />
        <ListSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description={`Customer records for ${current.name}.`}
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <LuPlus aria-hidden="true" />
            New Customer
          </Button>
        }
      />

      {createOpen ? (
        <CustomerCreateDialog open onOpenChange={handleCreateOpenChange} />
      ) : null}

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q: searchDraft.trim(), page: "1" });
        }}
      >
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="customer-search">Search</Label>
          <div className="relative">
            <LuSearch
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="customer-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Name, phone, email, or id"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customer-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              updateParams({ status: value ?? ALL, page: "1" })
            }
          >
            <SelectTrigger id="customer-status" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {CUSTOMER_STATUS_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit">Apply search</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchDraft("");
              router.replace(pathname);
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {customersQuery.server.isLoading ? <ListSkeleton /> : null}

      {customersQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {customersQuery.server.error?.message ??
              "Unable to load customers."}
          </p>
          {customersQuery.server.error?.unauthorized ? (
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
              onClick={() => void customersQuery.refetch()}
            >
              Retry
            </button>
          )}
        </div>
      ) : null}

      {customersQuery.server.isSuccess && filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {customersQuery.customers.length === 0
              ? "No customers found."
              : "No customers match these filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {customersQuery.customers.length === 0
              ? "Create a customer to start intake for this organization."
              : "Try clearing search or changing the status filter."}
          </p>
          {customersQuery.customers.length === 0 ? (
            <Button type="button" className="mt-4" onClick={openCreateDialog}>
              <LuPlus aria-hidden="true" />
              New Customer
            </Button>
          ) : null}
        </div>
      ) : null}

      {customersQuery.server.isSuccess && filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                        title={customer.id}
                      >
                        {shortId(customer.id)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="hover:text-primary"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.email ?? "—"}</TableCell>
                    <TableCell>
                      <CustomerStatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate">
                      {formatCustomerAddress(customer) ?? "—"}
                    </TableCell>
                    <TableCell>
                      {formatDate(customer.createdAt, timeZone)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
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
              <p className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </p>
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
        </div>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <span className="sr-only">Loading customers</span>
    </div>
  );
}
