/**
 * Typed API resource functions — organization analytics.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  AnalyticsCustomersResponse,
  AnalyticsDateRangeQuery,
  AnalyticsJobsResponse,
  AnalyticsOverviewResponse,
  AnalyticsPageQuery,
  AnalyticsRevenueResponse,
  AnalyticsTechniciansResponse,
  ListAnalyticsRevenueQuery,
} from "@/lib/types";

function toDateRangeParams(query?: AnalyticsDateRangeQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query?.fromDate) params.set("fromDate", query.fromDate);
  if (query?.toDate) params.set("toDate", query.toDate);
  return params;
}

function toPageParams(query?: AnalyticsPageQuery): string {
  const params = toDateRangeParams(query);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function toRevenueParams(query?: ListAnalyticsRevenueQuery): string {
  const params = toDateRangeParams(query);
  if (query?.period) params.set("period", query.period);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function toRangeQuery(query?: AnalyticsDateRangeQuery): string {
  const value = toDateRangeParams(query).toString();
  return value ? `?${value}` : "";
}

export function getAnalyticsOverview(
  organizationId: string,
  query?: AnalyticsDateRangeQuery,
): Promise<AnalyticsOverviewResponse> {
  return api.get<AnalyticsOverviewResponse>(
    `/analytics/overview${toRangeQuery(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getAnalyticsJobs(
  organizationId: string,
  query?: AnalyticsDateRangeQuery,
): Promise<AnalyticsJobsResponse> {
  return api.get<AnalyticsJobsResponse>(
    `/analytics/jobs${toRangeQuery(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getAnalyticsRevenue(
  organizationId: string,
  query?: ListAnalyticsRevenueQuery,
): Promise<AnalyticsRevenueResponse> {
  return api.get<AnalyticsRevenueResponse>(
    `/analytics/revenue${toRevenueParams(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getAnalyticsTechnicians(
  organizationId: string,
  query?: AnalyticsPageQuery,
): Promise<AnalyticsTechniciansResponse> {
  return api.get<AnalyticsTechniciansResponse>(
    `/analytics/technicians${toPageParams(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getAnalyticsCustomers(
  organizationId: string,
  query?: AnalyticsPageQuery,
): Promise<AnalyticsCustomersResponse> {
  return api.get<AnalyticsCustomersResponse>(
    `/analytics/customers${toPageParams(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}
