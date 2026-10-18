"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createTechnician,
  deactivateTechnician,
  getTechnician,
  listTechnicians,
  updateTechnician,
} from "@/lib/api/technicians";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateTechnicianInput,
  ListTechniciansQuery,
  TechnicianListResponse,
  TechnicianResponse,
  UpdateTechnicianInput,
} from "@/lib/types";

function filtersKey(query?: ListTechniciansQuery) {
  return {
    status: query?.status,
  };
}

export const technicianQueries = {
  list: (organizationId: string, query?: ListTechniciansQuery) =>
    queryOptions({
      queryKey: queryKeys.technicians.list(organizationId, filtersKey(query)),
      queryFn: () => listTechnicians(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.technicians.detail(organizationId, id),
      queryFn: () => getTechnician(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),
};

export function useTechniciansQuery(
  organizationId: string,
  query?: ListTechniciansQuery,
) {
  const result = useQuery(technicianQueries.list(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.technicians.length === 0,
  );

  return {
    ...result,
    technicians: result.data?.technicians ?? [],
    server: state,
  };
}

export function useTechnicianQuery(organizationId: string, id: string) {
  const result = useQuery(technicianQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    technician: result.data?.technician ?? null,
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

function cacheTechnician(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  data: TechnicianResponse,
) {
  queryClient.setQueryData<TechnicianResponse>(
    queryKeys.technicians.detail(organizationId, data.technician.id),
    data,
  );
}

export function useCreateTechnicianMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTechnicianInput) =>
      createTechnician(organizationId, input),
    onSuccess: async (data) => {
      cacheTechnician(queryClient, organizationId, data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.technicians.lists(organizationId),
      });
    },
  });
}

export function useUpdateTechnicianMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateTechnicianInput;
    }) => updateTechnician(organizationId, id, body),
    onSuccess: async (data) => {
      cacheTechnician(queryClient, organizationId, data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.technicians.lists(organizationId),
      });
    },
  });
}

export function useDeactivateTechnicianMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateTechnician(organizationId, id),
    onSuccess: async (data) => {
      cacheTechnician(queryClient, organizationId, data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.technicians.lists(organizationId),
      });
    },
  });
}

export type { TechnicianListResponse };
