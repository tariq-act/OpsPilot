"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuRefreshCw } from "react-icons/lu";

import {
  AuditActionBadge,
  AuditEntityTypeBadge,
} from "@/components/audit-logs/audit-log-badges";
import { AuditLogDetailDialog } from "@/components/audit-logs/audit-log-detail-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
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
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_TYPES,
  AUDIT_ENTITY_TYPE_LABEL,
  type AuditAction,
  type AuditEntityType,
} from "@/lib/audit-labels";
import {
  formatDateParam,
  parseDateParam,
  toIsoDateEnd,
  toIsoDateStart,
} from "@/lib/dispatch-date";
import { formatDateTime, shortId } from "@/lib/format";
import { isAuditViewerRole } from "@/lib/member-roles";
import { useAuditLogsQuery } from "@/lib/query/audit-logs";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useOrganizationMembersQuery } from "@/lib/query/organizations";
import { cn } from "@/lib/utils";
import type { ListAuditLogsQuery } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 25;

export function AuditLogList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const actorUserId = searchParams.get("actorUserId") ?? ALL;
  const action = (searchParams.get("action") ?? ALL) as AuditAction | typeof ALL;
  const entityType = (searchParams.get("entityType") ?? ALL) as
    | AuditEntityType
    | typeof ALL;
  const entityId = searchParams.get("entityId") ?? "";
  const fromDateParam = searchParams.get("fromDate") ?? "";
  const toDateParam = searchParams.get("toDate") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const selectedId = searchParams.get("id");
  const [entityIdDraft, setEntityIdDraft] = useState(entityId);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canView = isAuditViewerRole(current?.role);

  const listQuery = useMemo((): ListAuditLogsQuery => {
    return {
      actorUserId: actorUserId === ALL ? undefined : actorUserId,
      action: action === ALL ? undefined : action,
      entityType: entityType === ALL ? undefined : entityType,
      entityId: entityId.trim() || undefined,
      fromDate: toIsoDateStart(parseDateParam(fromDateParam)),
      toDate: toIsoDateEnd(parseDateParam(toDateParam)),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    };
  }, [
    actorUserId,
    action,
    entityType,
    entityId,
    fromDateParam,
    toDateParam,
    page,
  ]);

  const logsQuery = useAuditLogsQuery(
    canView ? organizationId : "",
    listQuery,
    canView,
  );
  const membersQuery = useOrganizationMembersQuery(
    canView ? organizationId : "",
  );

  const actorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of membersQuery.members) {
      map.set(
        member.userId,
        member.userName?.trim() || member.userEmail || shortId(member.userId),
      );
    }
    return map;
  }, [membersQuery.members]);

  function actorLabel(actorUserIdValue: string | null | undefined): string {
    if (!actorUserIdValue) return "System";
    return (
      actorNameById.get(actorUserIdValue) ?? shortId(actorUserIdValue)
    );
  }

  function updateParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
    }
    if (
      "actorUserId" in patch ||
      "action" in patch ||
      "entityType" in patch ||
      "entityId" in patch ||
      "fromDate" in patch ||
      "toDate" in patch
    ) {
      next.delete("page");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    router.replace(pathname);
  }

  const hasFilters =
    actorUserId !== ALL ||
    action !== ALL ||
    entityType !== ALL ||
    Boolean(entityId.trim()) ||
    Boolean(fromDateParam) ||
    Boolean(toDateParam);

  const hasNextPage = logsQuery.auditLogs.length === PAGE_SIZE;
  const hasPrevPage = page > 1;

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Audit Logs" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Audit Logs" />
        <p role="alert" className="text-sm text-destructive">
          Only owners and admins can view organization audit logs.
        </p>
      </div>
    );
  }

  if (logsQuery.forbidden) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Audit Logs" />
        <p role="alert" className="text-sm text-destructive">
          You do not have permission to view audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Logs"
        description={`Organization activity history for ${current.name}.`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void logsQuery.refetch()}
            disabled={logsQuery.server.isFetching}
          >
            <LuRefreshCw
              className={cn(
                logsQuery.server.isFetching && "animate-spin",
              )}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label>Actor</Label>
            <Select
              value={actorUserId}
              onValueChange={(value) =>
                updateParams({ actorUserId: value ?? ALL })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All actors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actors</SelectItem>
                {membersQuery.members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.userName?.trim() ||
                      member.userEmail ||
                      shortId(member.userId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Action</Label>
            <Select
              value={action}
              onValueChange={(value) =>
                updateParams({ action: value ?? ALL })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {AUDIT_ACTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {AUDIT_ACTION_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Entity type</Label>
            <Select
              value={entityType}
              onValueChange={(value) =>
                updateParams({ entityType: value ?? ALL })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {AUDIT_ENTITY_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {AUDIT_ENTITY_TYPE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-entity-id">Entity ID</Label>
            <Input
              id="audit-entity-id"
              value={entityIdDraft}
              placeholder="Resource ID"
              onChange={(event) => setEntityIdDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateParams({ entityId: entityIdDraft.trim() });
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-from">From</Label>
            <DatePicker
              id="audit-from"
              value={parseDateParam(fromDateParam)}
              onChange={(date) =>
                updateParams({ fromDate: formatDateParam(date) })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-to">To</Label>
            <DatePicker
              id="audit-to"
              value={parseDateParam(toDateParam)}
              onChange={(date) =>
                updateParams({ toDate: formatDateParam(date) })
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateParams({ entityId: entityIdDraft.trim() })
            }
          >
            Apply filters
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEntityIdDraft("");
                clearFilters();
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {logsQuery.server.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : logsQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {toUserErrorMessage(
              logsQuery.error,
              "Unable to load audit logs.",
            )}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void logsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : logsQuery.auditLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "No audit events match these filters."
              : "No audit events recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(log.createdAt, timeZone)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {actorLabel(log.actorUserId)}
                    </TableCell>
                    <TableCell>
                      <AuditActionBadge action={log.action} />
                    </TableCell>
                    <TableCell>
                      <AuditEntityTypeBadge entityType={log.entityType} />
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs text-muted-foreground"
                      title={log.entityId}
                    >
                      {shortId(log.entityId)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateParams({ id: log.id })}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Page {page}
              {hasNextPage ? " · more available" : null}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrevPage}
                onClick={() =>
                  updateParams({ page: String(Math.max(1, page - 1)) })
                }
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <AuditLogDetailDialog
        organizationId={organizationId}
        auditLogId={selectedId}
        resolveActorLabel={actorLabel}
        timeZone={timeZone}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) updateParams({ id: "" });
        }}
      />
    </div>
  );
}
