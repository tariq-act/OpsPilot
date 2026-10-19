/**
 * Typed API resource functions — invoices and invoice payments.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  InvoiceListResponse,
  InvoiceResponse,
  ListInvoicesQuery,
  PaymentListResponse,
  PaymentResponse,
  UpdateInvoiceInput,
} from "@/lib/types";

function toQueryString(query?: ListInvoicesQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.jobId) params.set("jobId", query.jobId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listInvoices(
  organizationId: string,
  query?: ListInvoicesQuery,
): Promise<InvoiceListResponse> {
  return api.get<InvoiceListResponse>(`/invoices${toQueryString(query)}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function getInvoice(
  organizationId: string,
  id: string,
): Promise<InvoiceResponse> {
  return api.get<InvoiceResponse>(`/invoices/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createInvoice(
  organizationId: string,
  body: CreateInvoiceInput,
): Promise<InvoiceResponse> {
  return api.post<InvoiceResponse>("/invoices", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateInvoice(
  organizationId: string,
  id: string,
  body: UpdateInvoiceInput,
): Promise<InvoiceResponse> {
  return api.patch<InvoiceResponse>(`/invoices/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function sendInvoice(
  organizationId: string,
  id: string,
): Promise<InvoiceResponse> {
  return api.post<InvoiceResponse>(
    `/invoices/${id}/send`,
    undefined,
    { headers: organizationHeaders(organizationId) },
  );
}

export function voidInvoice(
  organizationId: string,
  id: string,
): Promise<InvoiceResponse> {
  return api.post<InvoiceResponse>(
    `/invoices/${id}/void`,
    undefined,
    { headers: organizationHeaders(organizationId) },
  );
}

export function listInvoicePayments(
  organizationId: string,
  invoiceId: string,
): Promise<PaymentListResponse> {
  return api.get<PaymentListResponse>(`/invoices/${invoiceId}/payments`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createInvoicePayment(
  organizationId: string,
  invoiceId: string,
  body: CreatePaymentInput,
): Promise<PaymentResponse> {
  return api.post<PaymentResponse>(
    `/invoices/${invoiceId}/payments`,
    body,
    { headers: organizationHeaders(organizationId) },
  );
}
