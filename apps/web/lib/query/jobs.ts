"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { listJobs } from "@/lib/api/jobs";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type { JobListResponse, ListJobsQuery } from "@/lib/types";

function filtersKey(query?: ListJobsQuery) {
  return {
    status: query?.status,
    customerId: query?.customerId,
    requestId: query?.requestId,
  };
}

export const jobQueries = {
  list: (organizationId: string, query?: ListJobsQuery) =>
    queryOptions({
      queryKey: queryKeys.jobs.list(organizationId, filtersKey(query)),
      queryFn: () => listJobs(organizationId, query),
      enabled: Boolean(organizationId),
    }),
};

export function useJobsQuery(organizationId: string, query?: ListJobsQuery) {
  const result = useQuery(jobQueries.list(organizationId, query));
  const state = getServerQueryState(result, (data) => data.jobs.length === 0);

  return {
    ...result,
    jobs: result.data?.jobs ?? [],
    server: state,
  };
}

export function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.all(organizationId),
    });
}

export type { JobListResponse };
