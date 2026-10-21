"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPlus, LuSearch } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  FollowUpStatusBadge,
  FollowUpTypeBadge,
} from "@/components/follow-ups/follow-up-badges";
import { FollowUpCreateDialog } from "@/components/follow-ups/follow-up-form";
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
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import {
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_STATUS_LABEL,
  FOLLOW_UP_TYPES,
  FOLLOW_UP_TYPE_LABEL,
} from "@/lib/follow-up-labels";
import { isFollowUpManagerRole } from "@/lib/member-roles";
import { useCustomersQuery } from "@/lib/query/customers";
import { useFollowUpsQuery } from "@/lib/query/follow-ups";
import { useJobsQuery } from "@/lib/query/jobs";
import type { FollowUpStatus, FollowUpType } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 20;

export function FollowUpList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? ALL) as
    | FollowUpStatus
    | typeof ALL;
  const type = (searchParams.get("type") ?? ALL) as FollowUpType | typeof ALL;
  const customerId = searchParams.get("customerId") ?? ALL;
  const jobId = searchParams.get("jobId") ?? "";
  const search = searchParams.get("q") ?? "";
  const createOpen = searchParams.get("create") === "1";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [searchDraft, setSearchDraft] = useState(search);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isFollowUpManagerRole(current?.role);

  const listQuery = useMemo(
    () => ({
      status: status === ALL ? undefined : status,
      type: type === ALL ? undefined : type,
      customerId: customerId === ALL ? undefined : customerId,
      jobId: jobId || undefined,
    }),
    [status, type, customerId, jobId],
  );

  const followUpsQuery = useFollowUpsQuery(organizationId, listQuery);
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

  const needle = search.trim().toLowerCase();
  let filtered = followUpsQuery.followUps;
  if (needle) {
    filtered = filtered.filter((followUp) => {
      const customerName = customerNameById.get(followUp.customerId) ?? "";
      const jobTitle = followUp.jobId
        ? (jobTitleById.get(followUp.jobId) ?? "")
        : "";
      return (
        followUp.id.toLowerCase().includes(needle) ||
        customerName.toLowerCase().includes(needle) ||
        jobTitle.toLowerCase().includes(needle) ||
        (followUp.notes ?? "").toLowerCase().includes(needle) ||
        FOLLOW_UP_TYPE_LABEL[followUp.type].toLowerCase().includes(needle)
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
    if (
      "status" in patch ||
      "type" in patch ||
      "customerId" in patch ||
      "jobId" in patch ||
      "q" in patch
    ) {
      next.delete("page");
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
        <PageHeader title="Follow-ups" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Follow-ups" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can manage follow-ups.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Follow-ups"
        description="Customer feedback and maintenance reminder follow-ups."
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <LuPlus aria-hidden="true" />
            Create follow-up
          </Button>
        }
      />

      {createOpen ? (
        <FollowUpCreateDialog
          key={`${customerId}-${jobId}`}
          open
          onOpenChange={handleCreateOpenChange}
          defaultCustomerId={customerId === ALL ? undefined : customerId}
          defaultJobId={jobId || undefined}
        />
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="follow-up-search">Search</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LuSearch
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="follow-up-search"
                  className="pl-9"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      updateParams({ q: searchDraft.trim() });
                    }
                  }}
                  placeholder="Customer, job, or notes"
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
                {FOLLOW_UP_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {FOLLOW_UP_STATUS_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                updateParams({ type: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {FOLLOW_UP_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {FOLLOW_UP_TYPE_LABEL[option]}
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
      </div>

      {followUpsQuery.server.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : followUpsQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {followUpsQuery.server.error?.message ??
              "Unable to load follow-ups."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void followUpsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No follow-ups match these filters.
          </p>
          <Button type="button" className="mt-4" onClick={openCreateDialog}>
            Create follow-up
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((followUp) => (
                  <TableRow key={followUp.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/follow-ups/${followUp.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {customerNameById.get(followUp.customerId) ??
                          shortId(followUp.customerId)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {shortId(followUp.id)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {followUp.jobId ? (
                        <Link
                          href={`/dashboard/jobs/${followUp.jobId}`}
                          className="text-sm hover:text-primary"
                        >
                          {jobTitleById.get(followUp.jobId) ??
                            shortId(followUp.jobId)}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <FollowUpTypeBadge type={followUp.type} />
                    </TableCell>
                    <TableCell>
                      <FollowUpStatusBadge status={followUp.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(followUp.dueAt, timeZone)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(followUp.createdAt, timeZone)}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-sm text-muted-foreground">
                      {followUp.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
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
        </>
      )}
    </div>
  );
}
