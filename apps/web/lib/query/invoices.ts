"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createInvoice,
  createInvoicePayment,
  getInvoice,
  listInvoicePayments,
  listInvoices,
  sendInvoice,
  updateInvoice,
  voidInvoice,
} from "@/lib/api/invoices";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  InvoiceListResponse,
  InvoiceResponse,
  ListInvoicesQuery,
  UpdateInvoiceInput,
} from "@/lib/types";

function filtersKey(query?: ListInvoicesQuery) {
  return {
    status: query?.status,
    customerId: query?.customerId,
    jobId: query?.jobId,
  };
}

async function invalidateInvoiceViews(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  invoiceId?: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.invoices.lists(organizationId),
  });
  if (invoiceId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.invoices.detail(organizationId, invoiceId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.invoices.payments(organizationId, invoiceId),
    });
  }
  // Send/payment may trigger automation follow-ups and notifications.
  await queryClient.invalidateQueries({
    queryKey: queryKeys.followUps.all(organizationId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.all(organizationId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.analytics.all(organizationId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.auditLogs.all(organizationId),
  });
}

function cacheInvoice(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  data: InvoiceResponse,
) {
  queryClient.setQueryData<InvoiceResponse>(
    queryKeys.invoices.detail(organizationId, data.invoice.id),
    data,
  );
}

export const invoiceQueries = {
  list: (organizationId: string, query?: ListInvoicesQuery) =>
    queryOptions({
      queryKey: queryKeys.invoices.list(organizationId, filtersKey(query)),
      queryFn: () => listInvoices(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.invoices.detail(organizationId, id),
      queryFn: () => getInvoice(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  payments: (organizationId: string, invoiceId: string) =>
    queryOptions({
      queryKey: queryKeys.invoices.payments(organizationId, invoiceId),
      queryFn: () => listInvoicePayments(organizationId, invoiceId),
      enabled: Boolean(organizationId) && Boolean(invoiceId),
    }),
};

export function useInvoicesQuery(
  organizationId: string,
  query?: ListInvoicesQuery,
) {
  const result = useQuery(invoiceQueries.list(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.invoices.length === 0,
  );

  return {
    ...result,
    invoices: result.data?.invoices ?? [],
    server: state,
  };
}

export function useInvoiceQuery(organizationId: string, id: string) {
  const result = useQuery(invoiceQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    invoice: result.data?.invoice ?? null,
    server: state,
  };
}

export function useInvoicePaymentsQuery(
  organizationId: string,
  invoiceId: string,
) {
  const result = useQuery(invoiceQueries.payments(organizationId, invoiceId));
  const state = getServerQueryState(
    result,
    (data) => data.payments.length === 0,
  );

  return {
    ...result,
    payments: result.data?.payments ?? [],
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

export function useCreateInvoiceMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateInvoiceInput) =>
      createInvoice(organizationId, body),
    onSuccess: async (data) => {
      cacheInvoice(queryClient, organizationId, data);
      await invalidateInvoiceViews(
        queryClient,
        organizationId,
        data.invoice.id,
      );
    },
  });
}

export function useUpdateInvoiceMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInvoiceInput }) =>
      updateInvoice(organizationId, id, body),
    onSuccess: async (data) => {
      cacheInvoice(queryClient, organizationId, data);
      await invalidateInvoiceViews(
        queryClient,
        organizationId,
        data.invoice.id,
      );
    },
  });
}

export function useSendInvoiceMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sendInvoice(organizationId, id),
    onSuccess: async (data) => {
      cacheInvoice(queryClient, organizationId, data);
      await invalidateInvoiceViews(
        queryClient,
        organizationId,
        data.invoice.id,
      );
    },
  });
}

export function useVoidInvoiceMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => voidInvoice(organizationId, id),
    onSuccess: async (data) => {
      cacheInvoice(queryClient, organizationId, data);
      await invalidateInvoiceViews(
        queryClient,
        organizationId,
        data.invoice.id,
      );
    },
  });
}

export function useCreateInvoicePaymentMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      body,
    }: {
      invoiceId: string;
      body: CreatePaymentInput;
    }) => createInvoicePayment(organizationId, invoiceId, body),
    onSuccess: async (_data, variables) => {
      await invalidateInvoiceViews(
        queryClient,
        organizationId,
        variables.invoiceId,
      );
    },
  });
}

export type { InvoiceListResponse };
