/**
 * Typed API resource functions for the dashboard.
 * All calls go through the centralized api client in lib/api.ts.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { listAuditLogs as listAuditLogsResource } from "@/lib/api/audit-logs";
import { listInvoices as listInvoicesResource } from "@/lib/api/invoices";
import { listJobs as listJobsResource } from "@/lib/api/jobs";
import { listServiceRequests as listServiceRequestsResource } from "@/lib/api/service-requests";
import { listTechnicians as listTechniciansResource } from "@/lib/api/technicians";
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
  return listTechniciansResource(organizationId);
}

export function listInvoices(
  organizationId: string,
): Promise<InvoiceListResponse> {
  return listInvoicesResource(organizationId);
}

export function listAuditLogs(
  organizationId: string,
  limit: number,
  filters?: {
    entityType?: string;
    entityId?: string;
  },
): Promise<AuditLogListResponse> {
  return listAuditLogsResource(organizationId, {
    limit,
    entityType: filters?.entityType,
    entityId: filters?.entityId,
  });
}
