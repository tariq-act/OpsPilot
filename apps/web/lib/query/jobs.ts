"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { listJobs } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type { JobListResponse } from "@/lib/types";

export const jobQueries = {
  list: (organizationId: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.list(organizationId),
      queryFn: () => listJobs(organizationId),
      enabled: Boolean(organizationId),
    }),
};

export function useJobsQuery(organizationId: string) {
  const query = useQuery(jobQueries.list(organizationId));
  const state = getServerQueryState(query, (data) => data.jobs.length === 0);

  return {
    ...query,
    jobs: query.data?.jobs ?? [],
    server: state,
  };
}

/** Invalidate every job query for one organization after a write. */
export function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.all(organizationId),
    });
}

export type { JobListResponse };
