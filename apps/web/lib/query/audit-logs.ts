"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAuditLog, listAuditLogs } from "@/lib/api/audit-logs";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  AuditLogListResponse,
  ListAuditLogsQuery,
} from "@/lib/types";

function listFilterKey(query?: ListAuditLogsQuery) {
  return {
    actorUserId: query?.actorUserId,
    action: query?.action,
    entityType: query?.entityType,
    entityId: query?.entityId,
    fromDate: query?.fromDate,
    toDate: query?.toDate,
    limit: query?.limit === undefined ? undefined : String(query.limit),
    offset: query?.offset === undefined ? undefined : String(query.offset),
  };
}

export const auditLogQueries = {
  list: (
    organizationId: string,
    query?: ListAuditLogsQuery,
    enabled = true,
  ) =>
    queryOptions({
      queryKey: queryKeys.auditLogs.list(
        organizationId,
        listFilterKey(query),
      ),
      queryFn: () => listAuditLogs(organizationId, query),
      enabled: Boolean(organizationId) && enabled,
      retry(failureCount, error) {
        if (error instanceof ApiError && error.isForbidden) return false;
        return failureCount < 2;
      },
    }),

  detail: (organizationId: string, auditLogId: string, enabled = true) =>
    queryOptions({
      queryKey: queryKeys.auditLogs.detail(organizationId, auditLogId),
      queryFn: () => getAuditLog(organizationId, auditLogId),
      enabled: Boolean(organizationId) && Boolean(auditLogId) && enabled,
      retry(failureCount, error) {
        if (error instanceof ApiError && error.isForbidden) return false;
        return failureCount < 2;
      },
    }),
};

/**
 * List audit logs. Call sites that pass a numeric limit keep working;
 * the audit logs page passes a full ListAuditLogsQuery.
 */
export function useAuditLogsQuery(
  organizationId: string,
  limitOrQuery: number | ListAuditLogsQuery = 50,
  enabled = true,
  filters?: Pick<ListAuditLogsQuery, "entityType" | "entityId">,
) {
  const query: ListAuditLogsQuery =
    typeof limitOrQuery === "number"
      ? {
          limit: limitOrQuery,
          entityType: filters?.entityType,
          entityId: filters?.entityId,
        }
      : limitOrQuery;

  const result = useQuery(
    auditLogQueries.list(organizationId, query, enabled),
  );
  const state = getServerQueryState(
    result,
    (data) => data.auditLogs.length === 0,
  );
  const forbidden = result.error instanceof ApiError && result.error.isForbidden;

  return {
    ...result,
    auditLogs: result.data?.auditLogs ?? [],
    forbidden,
    server: state,
  };
}

export function useAuditLogQuery(
  organizationId: string,
  auditLogId: string,
  enabled = true,
) {
  const result = useQuery(
    auditLogQueries.detail(organizationId, auditLogId, enabled),
  );
  const state = getServerQueryState(result);
  const forbidden = result.error instanceof ApiError && result.error.isForbidden;

  return {
    ...result,
    auditLog: result.data?.auditLog ?? null,
    forbidden,
    server: state,
  };
}

export function useInvalidateAuditLogs() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.auditLogs.all(organizationId),
    });
}

export type { AuditLogListResponse };
