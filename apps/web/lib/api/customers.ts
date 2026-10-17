/**
 * Typed API resource functions — customers.
 * Used as lookups for Service Requests (not the Customers feature surface).
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type { CustomerListResponse, CustomerResponse } from "@/lib/types";

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
