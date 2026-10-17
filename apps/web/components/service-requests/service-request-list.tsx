"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPlus, LuSearch } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { useOrg } from "@/components/providers/org-provider";
import {
  ServiceRequestPriorityBadge,
  ServiceRequestStatusBadge,
} from "@/components/service-requests/request-badges";
import { ServiceRequestCreateDialog } from "@/components/service-requests/service-request-form";
import { Button } from "@/components/ui/button";
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
import { formatDate, shortId } from "@/lib/format";
import { useCustomersQuery } from "@/lib/query/customers";
import { useServiceRequestsQuery } from "@/lib/query/service-requests";
import {
  SERVICE_REQUEST_PRIORITY_LABEL,
  SERVICE_REQUEST_STATUS_LABEL,
} from "@/lib/service-request-status";
import type { ServiceRequestPriority, ServiceRequestStatus } from "@/lib/types";

const ALL = "all";

const STATUS_OPTIONS: ServiceRequestStatus[] = [
  "NEW",
  "IN_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
];

const PRIORITY_OPTIONS: ServiceRequestPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

function toIsoDateStart(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  ).toISOString();
}

function toIsoDateEnd(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    ),
  ).toISOString();
}

function parseDateParam(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateParam(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ServiceRequestList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? ALL) as
    | ServiceRequestStatus
    | typeof ALL;
  const priority = (searchParams.get("priority") ?? ALL) as
    | ServiceRequestPriority
    | typeof ALL;
  const fromDateParam = searchParams.get("fromDate") ?? "";
  const toDateParam = searchParams.get("toDate") ?? "";
  const search = searchParams.get("q") ?? "";
  const createParam = searchParams.get("create") === "1";

  const [searchDraft, setSearchDraft] = useState(search);
  const createOpen = createParam;
  const fromDate = parseDateParam(fromDateParam);
  const toDate = parseDateParam(toDateParam);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";

  const listQuery = useMemo(
    () => ({
      status: status === ALL ? undefined : status,
      priority: priority === ALL ? undefined : priority,
      fromDate: toIsoDateStart(parseDateParam(fromDateParam)),
      toDate: toIsoDateEnd(parseDateParam(toDateParam)),
    }),
    [status, priority, fromDateParam, toDateParam],
  );

  const requestsQuery = useServiceRequestsQuery(organizationId, listQuery);
  const customersQuery = useCustomersQuery(organizationId);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.customers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return requestsQuery.serviceRequests;
    return requestsQuery.serviceRequests.filter((request) => {
      const customerName = customerNameById.get(request.customerId) ?? "";
      return (
        request.id.toLowerCase().includes(needle) ||
        request.title.toLowerCase().includes(needle) ||
        customerName.toLowerCase().includes(needle)
      );
    });
  }, [requestsQuery.serviceRequests, customerNameById, search]);

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
        <PageHeader title="Service Requests" />
        <ListSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Service Requests"
        description={`Inbound work for ${current.name}.`}
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <LuPlus aria-hidden="true" />
            New Service Request
          </Button>
        }
      />

      {createOpen ? (
        <ServiceRequestCreateDialog
          open
          onOpenChange={handleCreateOpenChange}
        />
      ) : null}

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q: searchDraft.trim() });
        }}
      >
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="sr-search">Search</Label>
          <div className="relative">
            <LuSearch
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="sr-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Title, customer, or id"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sr-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              updateParams({ status: value ?? ALL })
            }
          >
            <SelectTrigger id="sr-status" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {SERVICE_REQUEST_STATUS_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sr-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              updateParams({ priority: value ?? ALL })
            }
          >
            <SelectTrigger id="sr-priority" className="w-full">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All priorities</SelectItem>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {SERVICE_REQUEST_PRIORITY_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sr-from">From date</Label>
          <DatePicker
            id="sr-from"
            value={fromDate}
            onChange={(date) =>
              updateParams({ fromDate: formatDateParam(date) })
            }
            placeholder="From date"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sr-to">To date</Label>
          <DatePicker
            id="sr-to"
            value={toDate}
            onChange={(date) =>
              updateParams({ toDate: formatDateParam(date) })
            }
            placeholder="To date"
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
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
          {requestsQuery.server.isFetching &&
          !requestsQuery.server.isLoading ? (
            <p className="text-xs text-muted-foreground">Updating…</p>
          ) : null}
        </div>
      </form>

      {requestsQuery.server.isLoading ? <ListSkeleton /> : null}

      {requestsQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {requestsQuery.server.error?.message ??
              "Unable to load service requests."}
          </p>
          {requestsQuery.server.error?.unauthorized ? (
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
              onClick={() => void requestsQuery.refetch()}
            >
              Retry
            </button>
          )}
        </div>
      ) : null}

      {requestsQuery.server.isSuccess && filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {requestsQuery.serviceRequests.length === 0
              ? "No service requests yet"
              : "No requests match these filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {requestsQuery.serviceRequests.length === 0
              ? "Create a request to start intake for this organization."
              : "Try clearing search or widening the date range."}
          </p>
          {requestsQuery.serviceRequests.length === 0 ? (
            <Button type="button" className="mt-4" onClick={openCreateDialog}>
              <LuPlus aria-hidden="true" />
              New Service Request
            </Button>
          ) : null}
        </div>
      ) : null}

      {requestsQuery.server.isSuccess && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Preferred date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/service-requests/${request.id}`}
                      className="font-mono text-sm font-medium text-primary hover:underline"
                      title={request.id}
                    >
                      {shortId(request.id)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {customerNameById.get(request.customerId) ??
                      shortId(request.customerId)}
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate font-medium">
                    <Link
                      href={`/dashboard/service-requests/${request.id}`}
                      className="hover:text-primary"
                    >
                      {request.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ServiceRequestStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    <ServiceRequestPriorityBadge priority={request.priority} />
                  </TableCell>
                  <TableCell>
                    {formatDate(request.createdAt, timeZone)}
                  </TableCell>
                  <TableCell>
                    {formatDate(request.preferredDate, timeZone)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      <span className="sr-only">Loading service requests</span>
    </div>
  );
}
