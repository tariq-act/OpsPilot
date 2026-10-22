"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPlus, LuSearch } from "react-icons/lu";

import {
  AutomationActiveBadge,
  AutomationTriggerBadge,
} from "@/components/automation/automation-badges";
import { AutomationRuleFormDialog } from "@/components/automation/automation-form";
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
import {
  AUTOMATION_TRIGGER_LABEL,
  AUTOMATION_TRIGGERS,
  summarizeActions,
} from "@/lib/automation-labels";
import { formatDateTime, shortId } from "@/lib/format";
import { isAutomationManagerRole } from "@/lib/member-roles";
import { useAutomationRulesQuery } from "@/lib/query/automation";
import type { AutomationTrigger } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 20;

export function AutomationList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const triggerEvent = (searchParams.get("triggerEvent") ?? ALL) as
    | AutomationTrigger
    | typeof ALL;
  const isActiveParam = searchParams.get("isActive") ?? ALL;
  const search = searchParams.get("q") ?? "";
  const createOpen = searchParams.get("create") === "1";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [searchDraft, setSearchDraft] = useState(search);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isAutomationManagerRole(current?.role);

  const listQuery = useMemo(
    () => ({
      triggerEvent: triggerEvent === ALL ? undefined : triggerEvent,
      isActive:
        isActiveParam === ALL
          ? undefined
          : isActiveParam === "true"
            ? true
            : isActiveParam === "false"
              ? false
              : undefined,
      limit: 100,
      offset: 0,
    }),
    [triggerEvent, isActiveParam],
  );

  const rulesQuery = useAutomationRulesQuery(organizationId, listQuery);

  const needle = search.trim().toLowerCase();
  let filtered = rulesQuery.rules;
  if (needle) {
    filtered = filtered.filter((rule) => {
      return (
        rule.name.toLowerCase().includes(needle) ||
        (rule.description ?? "").toLowerCase().includes(needle) ||
        AUTOMATION_TRIGGER_LABEL[rule.triggerEvent]
          .toLowerCase()
          .includes(needle) ||
        summarizeActions(rule.actions).toLowerCase().includes(needle) ||
        rule.id.toLowerCase().includes(needle)
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
      "triggerEvent" in patch ||
      "isActive" in patch ||
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
        <PageHeader title="Automation" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Automation" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can manage automation rules.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Automation"
        description="Rules that run when jobs, invoices, payments, or follow-ups change."
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <LuPlus aria-hidden="true" />
            Create rule
          </Button>
        }
      />

      {createOpen ? (
        <AutomationRuleFormDialog
          key="create"
          open
          onOpenChange={handleCreateOpenChange}
          mode="create"
        />
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="automation-search">Search</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LuSearch
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="automation-search"
                  className="pl-9"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      updateParams({ q: searchDraft.trim() });
                    }
                  }}
                  placeholder="Name, trigger, or action"
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
            <Label>Trigger</Label>
            <Select
              value={triggerEvent}
              onValueChange={(value) =>
                updateParams({ triggerEvent: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All triggers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All triggers</SelectItem>
                {AUTOMATION_TRIGGERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {AUTOMATION_TRIGGER_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={isActiveParam}
              onValueChange={(value) =>
                updateParams({ isActive: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {rulesQuery.server.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : rulesQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {rulesQuery.server.error?.message ??
              "Unable to load automation rules."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void rulesQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No automation rules match these filters.
          </p>
          <Button type="button" className="mt-4" onClick={openCreateDialog}>
            Create rule
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/automation/${rule.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {rule.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {shortId(rule.id)}
                        {rule.description
                          ? ` · ${rule.description}`
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <AutomationTriggerBadge trigger={rule.triggerEvent} />
                    </TableCell>
                    <TableCell className="max-w-[16rem] text-sm text-muted-foreground">
                      {summarizeActions(rule.actions)}
                    </TableCell>
                    <TableCell>
                      <AutomationActiveBadge isActive={rule.isActive} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(rule.createdAt, timeZone)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(rule.updatedAt, timeZone)}
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
