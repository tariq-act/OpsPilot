"use client";

import Link from "next/link";

import {
  AuditActionBadge,
  AuditEntityTypeBadge,
} from "@/components/audit-logs/audit-log-badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuditEntityHref } from "@/lib/audit-labels";
import { formatDateTime, shortId } from "@/lib/format";
import { useAuditLogQuery } from "@/lib/query/audit-logs";
import { toUserErrorMessage } from "@/lib/query/errors";

type AuditLogDetailDialogProps = {
  organizationId: string;
  auditLogId: string | null;
  resolveActorLabel: (actorUserId: string | null) => string;
  timeZone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function MetadataBlock({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No metadata recorded.</p>
    );
  }

  return (
    <dl className="flex flex-col gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {key}
          </dt>
          <dd className="mt-1 break-words font-mono text-xs text-foreground">
            {typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
              ? String(value)
              : JSON.stringify(value, null, 2)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditLogDetailDialog({
  organizationId,
  auditLogId,
  resolveActorLabel,
  timeZone,
  open,
  onOpenChange,
}: AuditLogDetailDialogProps) {
  const detailQuery = useAuditLogQuery(
    organizationId,
    auditLogId ?? "",
    open && Boolean(auditLogId),
  );

  const log = detailQuery.auditLog;
  const entityHref =
    log != null ? getAuditEntityHref(log.entityType, log.entityId) : null;
  const actorLabel = resolveActorLabel(log?.actorUserId ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Audit event</DialogTitle>
          <DialogDescription>
            Organization activity recorded for compliance and troubleshooting.
          </DialogDescription>
        </DialogHeader>

        {detailQuery.forbidden ? (
          <p role="alert" className="text-sm text-destructive">
            You do not have permission to view this audit event.
          </p>
        ) : null}

        {detailQuery.server.isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <div className="h-6 animate-pulse rounded-md bg-muted" />
            <div className="h-24 animate-pulse rounded-md bg-muted" />
            <span className="sr-only">Loading audit event</span>
          </div>
        ) : null}

        {detailQuery.server.isError && !detailQuery.forbidden ? (
          <p role="alert" className="text-sm text-destructive">
            {toUserErrorMessage(
              detailQuery.error,
              "Unable to load this audit event.",
            )}
          </p>
        ) : null}

        {log ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <AuditActionBadge action={log.action} />
              <AuditEntityTypeBadge entityType={log.entityType} />
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  When
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDateTime(log.createdAt, timeZone)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Actor
                </dt>
                <dd className="mt-1 text-sm text-foreground">{actorLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Resource
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {entityHref ? (
                    <Link
                      href={entityHref}
                      className="font-medium text-primary hover:text-primary/80"
                    >
                      {shortId(log.entityId)}
                    </Link>
                  ) : (
                    <span title={log.entityId}>{shortId(log.entityId)}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Event ID
                </dt>
                <dd className="mt-1 font-mono text-xs text-muted-foreground">
                  {log.id}
                </dd>
              </div>
              {log.ipAddress ? (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    IP address
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-foreground">
                    {log.ipAddress}
                  </dd>
                </div>
              ) : null}
              {log.userAgent ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    User agent
                  </dt>
                  <dd className="mt-1 break-words text-xs text-muted-foreground">
                    {log.userAgent}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Metadata
              </h3>
              <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
                <MetadataBlock metadata={log.metadata ?? {}} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
