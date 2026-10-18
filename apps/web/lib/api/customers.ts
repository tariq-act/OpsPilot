/**
 * Typed API resource functions — customers.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  CreateCustomerInput,
  CustomerListResponse,
  CustomerResponse,
  UpdateCustomerInput,
} from "@/lib/types";

export function listCustomers(
  organizationId: string,
): Promise<CustomerListResponse> {
  return api.get<CustomerListResponse>("/customers", {
    headers: organizationHeaders(organizationId),
  });
}

export function getCustomer(
  organizationId: string,
  id: string,
): Promise<CustomerResponse> {
  return api.get<CustomerResponse>(`/customers/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createCustomer(
  organizationId: string,
  body: CreateCustomerInput,
): Promise<CustomerResponse> {
  return api.post<CustomerResponse>("/customers", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateCustomer(
  organizationId: string,
  id: string,
  body: UpdateCustomerInput,
): Promise<CustomerResponse> {
  return api.patch<CustomerResponse>(`/customers/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}

/** Soft deactivate: sets status to INACTIVE. */
export function deactivateCustomer(
  organizationId: string,
  id: string,
): Promise<CustomerResponse> {
  return api.delete<CustomerResponse>(`/customers/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}
