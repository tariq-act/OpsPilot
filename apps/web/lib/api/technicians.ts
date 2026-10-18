/**
 * Typed API resource functions — technicians.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  CreateTechnicianInput,
  ListTechniciansQuery,
  TechnicianListResponse,
  TechnicianResponse,
  UpdateTechnicianInput,
} from "@/lib/types";

function toQueryString(query?: ListTechniciansQuery): string {
  if (!query?.status) return "";
  const params = new URLSearchParams();
  params.set("status", query.status);
  return `?${params.toString()}`;
}

export function listTechnicians(
  organizationId: string,
  query?: ListTechniciansQuery,
): Promise<TechnicianListResponse> {
  return api.get<TechnicianListResponse>(
    `/technicians${toQueryString(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getTechnician(
  organizationId: string,
  id: string,
): Promise<TechnicianResponse> {
  return api.get<TechnicianResponse>(`/technicians/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createTechnician(
  organizationId: string,
  body: CreateTechnicianInput,
): Promise<TechnicianResponse> {
  return api.post<TechnicianResponse>("/technicians", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateTechnician(
  organizationId: string,
  id: string,
  body: UpdateTechnicianInput,
): Promise<TechnicianResponse> {
  return api.patch<TechnicianResponse>(`/technicians/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}

/** Soft deactivate: sets status to INACTIVE. */
export function deactivateTechnician(
  organizationId: string,
  id: string,
): Promise<TechnicianResponse> {
  return api.delete<TechnicianResponse>(`/technicians/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}
