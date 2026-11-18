"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createCustomer,
  deactivateCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/api/customers";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateCustomerInput,
  CustomerResponse,
  UpdateCustomerInput,
} from "@/lib/types";

export const customerQueries = {
  list: (organizationId: string) =>
    queryOptions({
      queryKey: queryKeys.customers.list(organizationId),
      queryFn: () => listCustomers(organizationId),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, customerId: string) =>
    queryOptions({
      queryKey: queryKeys.customers.detail(organizationId, customerId),
      queryFn: () => getCustomer(organizationId, customerId),
      enabled: Boolean(organizationId) && Boolean(customerId),
    }),
};

export function useCustomersQuery(organizationId: string) {
  const query = useQuery(customerQueries.list(organizationId));
  const state = getServerQueryState(
    query,
    (data) => data.customers.length === 0,
  );

  return {
    ...query,
    customers: query.data?.customers ?? [],
    server: state,
  };
}

export function useCustomerQuery(organizationId: string, customerId: string) {
  const query = useQuery(customerQueries.detail(organizationId, customerId));
  const state = getServerQueryState(query);

  return {
    ...query,
    customer: query.data?.customer ?? null,
    server: state,
  };
}

export function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.customers.all(organizationId),
    });
}

function cacheCustomer(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  data: CustomerResponse,
) {
  queryClient.setQueryData<CustomerResponse>(
    queryKeys.customers.detail(organizationId, data.customer.id),
    data,
  );
}

async function invalidateCustomerSideEffects(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.customers.lists(organizationId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.auditLogs.all(organizationId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.analytics.all(organizationId),
  });
}

export function useCreateCustomerMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      createCustomer(organizationId, input),
    onSuccess: async (data) => {
      cacheCustomer(queryClient, organizationId, data);
      await invalidateCustomerSideEffects(queryClient, organizationId);
    },
  });
}

export function useUpdateCustomerMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateCustomerInput;
    }) => updateCustomer(organizationId, id, body),
    onSuccess: async (data) => {
      cacheCustomer(queryClient, organizationId, data);
      await invalidateCustomerSideEffects(queryClient, organizationId);
    },
  });
}

export function useDeactivateCustomerMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateCustomer(organizationId, id),
    onSuccess: async (data) => {
      cacheCustomer(queryClient, organizationId, data);
      await invalidateCustomerSideEffects(queryClient, organizationId);
    },
  });
}
