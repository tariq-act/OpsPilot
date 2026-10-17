"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  cancelServiceRequest,
  createServiceRequest,
  getServiceRequest,
  listServiceRequests,
  updateServiceRequest,
} from "@/lib/api/service-requests";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateServiceRequestInput,
  ListServiceRequestsQuery,
  ServiceRequestListResponse,
  ServiceRequestResponse,
  UpdateServiceRequestInput,
} from "@/lib/types";

function filtersKey(query?: ListServiceRequestsQuery) {
  return {
    status: query?.status,
    priority: query?.priority,
    customerId: query?.customerId,
    fromDate: query?.fromDate,
    toDate: query?.toDate,
  };
}

export const serviceRequestQueries = {
  list: (organizationId: string, query?: ListServiceRequestsQuery) =>
    queryOptions({
      queryKey: queryKeys.serviceRequests.list(
        organizationId,
        filtersKey(query),
      ),
      queryFn: () => listServiceRequests(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.serviceRequests.detail(organizationId, id),
      queryFn: () => getServiceRequest(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),
};

export function useServiceRequestsQuery(
  organizationId: string,
  query?: ListServiceRequestsQuery,
) {
  const result = useQuery(serviceRequestQueries.list(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.serviceRequests.length === 0,
  );

  return {
    ...result,
    serviceRequests: result.data?.serviceRequests ?? [],
    server: state,
  };
}

export function useServiceRequestQuery(organizationId: string, id: string) {
  const result = useQuery(serviceRequestQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    serviceRequest: result.data?.serviceRequest ?? null,
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

export function useCreateServiceRequestMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceRequestInput) =>
      createServiceRequest(organizationId, input),
    onSuccess: async (data) => {
      queryClient.setQueryData<ServiceRequestResponse>(
        queryKeys.serviceRequests.detail(
          organizationId,
          data.serviceRequest.id,
        ),
        data,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.serviceRequests.lists(organizationId),
      });
    },
  });
}

export function useUpdateServiceRequestMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateServiceRequestInput;
    }) => updateServiceRequest(organizationId, id, body),
    onSuccess: async (data) => {
      queryClient.setQueryData<ServiceRequestResponse>(
        queryKeys.serviceRequests.detail(
          organizationId,
          data.serviceRequest.id,
        ),
        data,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.serviceRequests.lists(organizationId),
      });
    },
  });
}

export function useCancelServiceRequestMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelServiceRequest(organizationId, id),
    onSuccess: async (data) => {
      queryClient.setQueryData<ServiceRequestResponse>(
        queryKeys.serviceRequests.detail(
          organizationId,
          data.serviceRequest.id,
        ),
        data,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.serviceRequests.lists(organizationId),
      });
    },
  });
}

export type { ServiceRequestListResponse };
