"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPlus, LuSearch } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { JobCreateDialog } from "@/components/jobs/job-form";
import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-badges";
import { useOrg } from "@/components/providers/org-provider";
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
import { formatDateTime, shortId } from "@/lib/format";
import { JOB_PRIORITY_LABEL, JOB_STATUS_LABEL } from "@/lib/job-status";
import { useCustomersQuery } from "@/lib/query/customers";
import { useJobsQuery } from "@/lib/query/jobs";
import { useTechniciansQuery } from "@/lib/query/technicians";
import type { JobPriority, JobStatus } from "@/lib/types";

const ALL = "all";

const STATUS_OPTIONS: JobStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITY_OPTIONS: JobPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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

export function JobList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? ALL) as JobStatus | typeof ALL;
  const priority = (searchParams.get("priority") ?? ALL) as
    | JobPriority
    | typeof ALL;
  const customerId = searchParams.get("customerId") ?? ALL;
  const technicianId = searchParams.get("technicianId") ?? ALL;
  const requestId = searchParams.get("requestId") ?? "";
  const fromDateParam = searchParams.get("fromDate") ?? "";
  const toDateParam = searchParams.get("toDate") ?? "";
  const search = searchParams.get("q") ?? "";
  const createOpen = searchParams.get("create") === "1";

  const [searchDraft, setSearchDraft] = useState(search);
  const fromDate = parseDateParam(fromDateParam);
  const toDate = parseDateParam(toDateParam);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";

  const listQuery = useMemo(
    () => ({
      status: status === ALL ? undefined : status,
      priority: priority === ALL ? undefined : priority,
      customerId: customerId === ALL ? undefined : customerId,
      technicianId: technicianId === ALL ? undefined : technicianId,
      requestId: requestId || undefined,
      fromDate: toIsoDateStart(parseDateParam(fromDateParam)),
      toDate: toIsoDateEnd(parseDateParam(toDateParam)),
    }),
    [
      status,
      priority,
      customerId,
      technicianId,
      requestId,
      fromDateParam,
      toDateParam,
    ],
  );

  const jobsQuery = useJobsQuery(organizationId, listQuery);
  const customersQuery = useCustomersQuery(organizationId);
  const techniciansQuery = useTechniciansQuery(organizationId);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.customers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return jobsQuery.jobs;
    return jobsQuery.jobs.filter((job) => {
      const customerName = customerNameById.get(job.customerId) ?? "";
      return (
        job.id.toLowerCase().includes(needle) ||
        job.title.toLowerCase().includes(needle) ||
        customerName.toLowerCase().includes(needle) ||
        job.requestId.toLowerCase().includes(needle)
      );
    });
  }, [jobsQuery.jobs, customerNameById, search]);

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
        <PageHeader title="Jobs" />
        <ListSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs"
        description={`Scheduled and field work for ${current.name}.`}
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <LuPlus aria-hidden="true" />
            New Job
          </Button>
        }
      />

      {createOpen ? (
        <JobCreateDialog
          open
          onOpenChange={handleCreateOpenChange}
          defaultRequestId={requestId || undefined}
          defaultCustomerId={
            customerId !== ALL ? customerId : undefined
          }
        />
      ) : null}

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q: searchDraft.trim() });
        }}
      >
        <div className="flex flex-col gap-1.5 xl:col-span-2">
          <Label htmlFor="job-search">Search</Label>
          <div className="relative">
            <LuSearch
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="job-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Title, customer, or id"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              updateParams({ status: value ?? ALL })
            }
          >
            <SelectTrigger id="job-status" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {JOB_STATUS_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              updateParams({ priority: value ?? ALL })
            }
          >
            <SelectTrigger id="job-priority" className="w-full">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All priorities</SelectItem>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {JOB_PRIORITY_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-customer">Customer</Label>
          <Select
            value={customerId}
            onValueChange={(value) =>
              updateParams({ customerId: value ?? ALL })
            }
          >
            <SelectTrigger id="job-customer" className="w-full">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-technician">Technician</Label>
          <Select
            value={technicianId}
            onValueChange={(value) =>
              updateParams({ technicianId: value ?? ALL })
            }
          >
            <SelectTrigger id="job-technician" className="w-full">
              <SelectValue placeholder="All technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All technicians</SelectItem>
              {techniciansQuery.technicians.map((technician) => (
                <SelectItem key={technician.id} value={technician.id}>
                  {technician.employeeCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-from">From date</Label>
          <DatePicker
            id="job-from"
            value={fromDate}
            onChange={(date) =>
              updateParams({ fromDate: formatDateParam(date) })
            }
            placeholder="From date"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-to">To date</Label>
          <DatePicker
            id="job-to"
            value={toDate}
            onChange={(date) =>
              updateParams({ toDate: formatDateParam(date) })
            }
            placeholder="To date"
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
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
          {requestId ? (
            <p className="text-xs text-muted-foreground">
              Filtered by request {shortId(requestId)}
            </p>
          ) : null}
          {jobsQuery.server.isFetching && !jobsQuery.server.isLoading ? (
            <p className="text-xs text-muted-foreground">Updating…</p>
          ) : null}
        </div>
      </form>

      {jobsQuery.server.isLoading ? <ListSkeleton /> : null}

      {jobsQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {jobsQuery.server.error?.message ?? "Unable to load jobs."}
          </p>
          {jobsQuery.server.error?.unauthorized ? (
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
              onClick={() => void jobsQuery.refetch()}
            >
              Retry
            </button>
          )}
        </div>
      ) : null}

      {jobsQuery.server.isSuccess && filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {jobsQuery.jobs.length === 0
              ? "No jobs found."
              : "No jobs match these filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobsQuery.jobs.length === 0
              ? "Create a job from an accepted service request."
              : "Try clearing search or widening filters."}
          </p>
          {jobsQuery.jobs.length === 0 ? (
            <Button type="button" className="mt-4" onClick={openCreateDialog}>
              <LuPlus aria-hidden="true" />
              New Job
            </Button>
          ) : null}
        </div>
      ) : null}

      {jobsQuery.server.isSuccess && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="font-mono text-sm font-medium text-primary hover:underline"
                      title={job.id}
                    >
                      {shortId(job.id)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {customerNameById.get(job.customerId) ??
                      shortId(job.customerId)}
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate font-medium">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="hover:text-primary"
                    >
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>
                    <JobPriorityBadge priority={job.priority} />
                  </TableCell>
                  <TableCell>
                    {formatDateTime(job.scheduledStart, timeZone)}
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
      <span className="sr-only">Loading jobs</span>
    </div>
  );
}
