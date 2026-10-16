"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { listTechnicians } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type { TechnicianListResponse } from "@/lib/types";

export const technicianQueries = {
  list: (organizationId: string) =>
    queryOptions({
      queryKey: queryKeys.technicians.list(organizationId),
      queryFn: () => listTechnicians(organizationId),
      enabled: Boolean(organizationId),
    }),
};

export function useTechniciansQuery(organizationId: string) {
  const query = useQuery(technicianQueries.list(organizationId));
  const state = getServerQueryState(
    query,
    (data) => data.technicians.length === 0,
  );

  return {
    ...query,
    technicians: query.data?.technicians ?? [],
    server: state,
  };
}

export function useInvalidateTechnicians() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.technicians.all(organizationId),
    });
}

export type { TechnicianListResponse };
