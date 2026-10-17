/**
 * Typed API resource functions — jobs.
 * Shared helpers used by dashboard and service-request detail.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type { JobListResponse, ListJobsQuery } from "@/lib/types";

function toQueryString(query?: ListJobsQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.requestId) params.set("requestId", query.requestId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listJobs(
  organizationId: string,
  query?: ListJobsQuery,
): Promise<JobListResponse> {
  return api.get<JobListResponse>(`/jobs${toQueryString(query)}`, {
    headers: organizationHeaders(organizationId),
  });
}
