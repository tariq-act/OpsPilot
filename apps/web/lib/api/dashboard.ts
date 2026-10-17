/**
 * Typed API resource functions for the dashboard.
 * All calls go through the centralized api client in lib/api.ts.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { listJobs as listJobsResource } from "@/lib/api/jobs";
import { organizationHeaders } from "@/lib/api/org-headers";
import { listServiceRequests as listServiceRequestsResource } from "@/lib/api/service-requests";
import type {
  AuditLogListResponse,
  InvoiceListResponse,
  JobListResponse,
  ServiceRequestListResponse,
  TechnicianListResponse,
} from "@/lib/types";

export function listJobs(organizationId: string): Promise<JobListResponse> {
  return listJobsResource(organizationId);
}

export function listServiceRequests(
  organizationId: string,
): Promise<ServiceRequestListResponse> {
  return listServiceRequestsResource(organizationId);
}

export function listTechnicians(
  organizationId: string,
): Promise<TechnicianListResponse> {
  return api.get<TechnicianListResponse>("/technicians", {
    headers: organizationHeaders(organizationId),
  });
}

export function listInvoices(
  organizationId: string,
): Promise<InvoiceListResponse> {
  return api.get<InvoiceListResponse>("/invoices", {
    headers: organizationHeaders(organizationId),
  });
}

export function listAuditLogs(
  organizationId: string,
  limit: number,
  filters?: {
    entityType?: string;
    entityId?: string;
  },
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.entityId) params.set("entityId", filters.entityId);
  return api.get<AuditLogListResponse>(`/audit-logs?${params.toString()}`, {
    headers: organizationHeaders(organizationId),
  });
}
