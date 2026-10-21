/**
 * Typed API resource functions — customer follow-ups.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  CreateFollowUpInput,
  FollowUpListResponse,
  FollowUpResponse,
  ListFollowUpsQuery,
  UpdateFollowUpInput,
} from "@/lib/types";

function toQueryString(query?: ListFollowUpsQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.jobId) params.set("jobId", query.jobId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listFollowUps(
  organizationId: string,
  query?: ListFollowUpsQuery,
): Promise<FollowUpListResponse> {
  return api.get<FollowUpListResponse>(
    `/follow-ups${toQueryString(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getFollowUp(
  organizationId: string,
  id: string,
): Promise<FollowUpResponse> {
  return api.get<FollowUpResponse>(`/follow-ups/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createFollowUp(
  organizationId: string,
  body: CreateFollowUpInput,
): Promise<FollowUpResponse> {
  return api.post<FollowUpResponse>("/follow-ups", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateFollowUp(
  organizationId: string,
  id: string,
  body: UpdateFollowUpInput,
): Promise<FollowUpResponse> {
  return api.patch<FollowUpResponse>(`/follow-ups/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}
