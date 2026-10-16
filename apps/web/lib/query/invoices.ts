"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { listInvoices } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type { InvoiceListResponse } from "@/lib/types";

export const invoiceQueries = {
  list: (organizationId: string) =>
    queryOptions({
      queryKey: queryKeys.invoices.list(organizationId),
      queryFn: () => listInvoices(organizationId),
      enabled: Boolean(organizationId),
    }),
};

export function useInvoicesQuery(organizationId: string) {
  const query = useQuery(invoiceQueries.list(organizationId));
  const state = getServerQueryState(
    query,
    (data) => data.invoices.length === 0,
  );

  return {
    ...query,
    invoices: query.data?.invoices ?? [],
    server: state,
  };
}

export function useInvalidateInvoices() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.invoices.all(organizationId),
    });
}

export type { InvoiceListResponse };
