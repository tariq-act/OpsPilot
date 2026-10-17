"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import { getCustomer, listCustomers } from "@/lib/api/customers";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";

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
