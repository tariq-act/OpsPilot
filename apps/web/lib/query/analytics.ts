"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  getAnalyticsCustomers,
  getAnalyticsJobs,
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getAnalyticsTechnicians,
} from "@/lib/api/analytics";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  AnalyticsDateRangeQuery,
  AnalyticsPageQuery,
  ListAnalyticsRevenueQuery,
} from "@/lib/types";

function rangeKey(query?: AnalyticsDateRangeQuery) {
  return {
    fromDate: query?.fromDate,
    toDate: query?.toDate,
  };
}

function pageKey(query?: AnalyticsPageQuery) {
  return {
    ...rangeKey(query),
    limit: query?.limit === undefined ? undefined : String(query.limit),
    offset: query?.offset === undefined ? undefined : String(query.offset),
  };
}

function revenueKey(query?: ListAnalyticsRevenueQuery) {
  return {
    ...rangeKey(query),
    period: query?.period,
  };
}

export const analyticsQueries = {
  overview: (organizationId: string, query?: AnalyticsDateRangeQuery) =>
    queryOptions({
      queryKey: queryKeys.analytics.overview(organizationId, rangeKey(query)),
      queryFn: () => getAnalyticsOverview(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  jobs: (organizationId: string, query?: AnalyticsDateRangeQuery) =>
    queryOptions({
      queryKey: queryKeys.analytics.jobs(organizationId, rangeKey(query)),
      queryFn: () => getAnalyticsJobs(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  revenue: (organizationId: string, query?: ListAnalyticsRevenueQuery) =>
    queryOptions({
      queryKey: queryKeys.analytics.revenue(organizationId, revenueKey(query)),
      queryFn: () => getAnalyticsRevenue(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  technicians: (organizationId: string, query?: AnalyticsPageQuery) =>
    queryOptions({
      queryKey: queryKeys.analytics.technicians(
        organizationId,
        pageKey(query),
      ),
      queryFn: () => getAnalyticsTechnicians(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  customers: (organizationId: string, query?: AnalyticsPageQuery) =>
    queryOptions({
      queryKey: queryKeys.analytics.customers(organizationId, pageKey(query)),
      queryFn: () => getAnalyticsCustomers(organizationId, query),
      enabled: Boolean(organizationId),
    }),
};

export function useAnalyticsOverviewQuery(
  organizationId: string,
  query?: AnalyticsDateRangeQuery,
) {
  const result = useQuery(analyticsQueries.overview(organizationId, query));
  const state = getServerQueryState(result);

  return {
    ...result,
    overview: result.data?.overview ?? null,
    server: state,
  };
}

export function useAnalyticsJobsQuery(
  organizationId: string,
  query?: AnalyticsDateRangeQuery,
) {
  const result = useQuery(analyticsQueries.jobs(organizationId, query));
  const state = getServerQueryState(result);

  return {
    ...result,
    jobs: result.data?.jobs ?? null,
    server: state,
  };
}

export function useAnalyticsRevenueQuery(
  organizationId: string,
  query?: ListAnalyticsRevenueQuery,
) {
  const result = useQuery(analyticsQueries.revenue(organizationId, query));
  const state = getServerQueryState(result);

  return {
    ...result,
    revenue: result.data?.revenue ?? null,
    server: state,
  };
}

export function useAnalyticsTechniciansQuery(
  organizationId: string,
  query?: AnalyticsPageQuery,
) {
  const result = useQuery(analyticsQueries.technicians(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.technicians.technicians.length === 0,
  );

  return {
    ...result,
    technicians: result.data?.technicians ?? null,
    server: state,
  };
}

export function useAnalyticsCustomersQuery(
  organizationId: string,
  query?: AnalyticsPageQuery,
) {
  const result = useQuery(analyticsQueries.customers(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.customers.customers.length === 0,
  );

  return {
    ...result,
    customers: result.data?.customers ?? null,
    server: state,
  };
}
