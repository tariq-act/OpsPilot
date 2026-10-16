"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { listAuditLogs } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type { AuditLogListResponse } from "@/lib/types";

export const auditLogQueries = {
  list: (organizationId: string, limit: number, enabled = true) =>
    queryOptions({
      queryKey: queryKeys.auditLogs.list(organizationId, limit),
      queryFn: () => listAuditLogs(organizationId, limit),
      enabled: Boolean(organizationId) && enabled,
      retry(failureCount, error) {
        if (error instanceof ApiError && error.isForbidden) return false;
        return failureCount < 2;
      },
    }),
};

export function useAuditLogsQuery(
  organizationId: string,
  limit: number,
  enabled = true,
) {
  const query = useQuery(auditLogQueries.list(organizationId, limit, enabled));
  const state = getServerQueryState(
    query,
    (data) => data.auditLogs.length === 0,
  );
  const forbidden = query.error instanceof ApiError && query.error.isForbidden;

  return {
    ...query,
    auditLogs: query.data?.auditLogs ?? [],
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
