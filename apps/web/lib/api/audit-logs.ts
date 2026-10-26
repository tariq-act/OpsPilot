/**
 * Typed API resource functions — organization audit logs.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  AuditLogListResponse,
  AuditLogResponse,
  ListAuditLogsQuery,
} from "@/lib/types";

function toListParams(query?: ListAuditLogsQuery): string {
  const params = new URLSearchParams();
  if (query?.actorUserId) params.set("actorUserId", query.actorUserId);
  if (query?.action) params.set("action", query.action);
  if (query?.entityType) params.set("entityType", query.entityType);
  if (query?.entityId) params.set("entityId", query.entityId);
  if (query?.fromDate) params.set("fromDate", query.fromDate);
  if (query?.toDate) params.set("toDate", query.toDate);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listAuditLogs(
  organizationId: string,
  query?: ListAuditLogsQuery,
): Promise<AuditLogListResponse> {
  return api.get<AuditLogListResponse>(
    `/audit-logs${toListParams(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getAuditLog(
  organizationId: string,
  auditLogId: string,
): Promise<AuditLogResponse> {
  return api.get<AuditLogResponse>(`/audit-logs/${auditLogId}`, {
    headers: organizationHeaders(organizationId),
  });
}
