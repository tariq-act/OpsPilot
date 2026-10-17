/**
 * Typed API resource functions — service requests.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  CreateServiceRequestInput,
  ListServiceRequestsQuery,
  ServiceRequestListResponse,
  ServiceRequestResponse,
  UpdateServiceRequestInput,
} from "@/lib/types";

function toQueryString(query?: ListServiceRequestsQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listServiceRequests(
  organizationId: string,
  query?: ListServiceRequestsQuery,
): Promise<ServiceRequestListResponse> {
  return api.get<ServiceRequestListResponse>(
    `/service-requests${toQueryString(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getServiceRequest(
  organizationId: string,
  id: string,
): Promise<ServiceRequestResponse> {
  return api.get<ServiceRequestResponse>(`/service-requests/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createServiceRequest(
  organizationId: string,
  body: CreateServiceRequestInput,
): Promise<ServiceRequestResponse> {
  return api.post<ServiceRequestResponse>("/service-requests", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateServiceRequest(
  organizationId: string,
  id: string,
  body: UpdateServiceRequestInput,
): Promise<ServiceRequestResponse> {
  return api.patch<ServiceRequestResponse>(`/service-requests/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}

/** Soft cancel: sets status to CANCELLED. */
export function cancelServiceRequest(
  organizationId: string,
  id: string,
): Promise<ServiceRequestResponse> {
  return api.delete<ServiceRequestResponse>(`/service-requests/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}
