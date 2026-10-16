"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { listServiceRequests } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type { ServiceRequestListResponse } from "@/lib/types";

export const serviceRequestQueries = {
  list: (organizationId: string) =>
    queryOptions({
      queryKey: queryKeys.serviceRequests.list(organizationId),
      queryFn: () => listServiceRequests(organizationId),
      enabled: Boolean(organizationId),
    }),
};

export function useServiceRequestsQuery(organizationId: string) {
  const query = useQuery(serviceRequestQueries.list(organizationId));
  const state = getServerQueryState(
    query,
    (data) => data.serviceRequests.length === 0,
  );

  return {
    ...query,
    serviceRequests: query.data?.serviceRequests ?? [],
    server: state,
  };
}

export function useInvalidateServiceRequests() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.serviceRequests.all(organizationId),
    });
}

export type { ServiceRequestListResponse };
