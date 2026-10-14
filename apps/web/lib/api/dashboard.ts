/**
 * Typed API resource functions for the dashboard.
 * All calls go through the centralized api client in lib/api.ts.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import type {
  AuditLogListResponse,
  InvoiceListResponse,
  JobListResponse,
  ServiceRequestListResponse,
  TechnicianListResponse,
} from "@/lib/types";

function organizationHeaders(organizationId: string): Record<string, string> {
  return { "x-organization-id": organizationId };
}

/** Jobs visible to the signed-in member in this organization. */
export function listJobs(organizationId: string): Promise<JobListResponse> {
  return api.get<JobListResponse>("/jobs", {
    headers: organizationHeaders(organizationId),
  });
}

/** Service requests visible to the signed-in member in this organization. */
export function listServiceRequests(
  organizationId: string,
): Promise<ServiceRequestListResponse> {
  return api.get<ServiceRequestListResponse>("/service-requests", {
    headers: organizationHeaders(organizationId),
  });
}

/** Technician profiles visible to the signed-in member in this organization. */
export function listTechnicians(
  organizationId: string,
): Promise<TechnicianListResponse> {
  return api.get<TechnicianListResponse>("/technicians", {
    headers: organizationHeaders(organizationId),
  });
}

/** Invoices visible to the signed-in member in this organization. */
export function listInvoices(
  organizationId: string,
): Promise<InvoiceListResponse> {
  return api.get<InvoiceListResponse>("/invoices", {
    headers: organizationHeaders(organizationId),
  });
}

/**
 * Newest audit events for this organization.
 * Owners and admins only. Other roles receive 403.
 */
export function listAuditLogs(
  organizationId: string,
  limit: number,
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  return api.get<AuditLogListResponse>(`/audit-logs?${params.toString()}`, {
    headers: organizationHeaders(organizationId),
  });
}
