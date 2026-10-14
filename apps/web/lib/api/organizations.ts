/**
 * Typed API resource functions — organizations.
 * All calls go through the centralized api client in lib/api.ts.
 */

import { api } from "@/lib/api";
import type {
  CreateOrganizationResponse,
  MemberListResponse,
  OrganizationListResponse,
} from "@/lib/types";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  phone?: string;
  email?: string;
  address?: string;
}

/** List all organizations the signed-in user belongs to. */
export function listOrganizations(): Promise<OrganizationListResponse> {
  return api.get<OrganizationListResponse>("/organizations");
}

/** Create a new organization. The caller becomes OWNER. */
export function createOrganization(
  data: CreateOrganizationInput,
): Promise<CreateOrganizationResponse> {
  return api.post<CreateOrganizationResponse>("/organizations", data);
}

/** List members of an organization. Requires active membership. */
export function listMembers(
  organizationId: string,
): Promise<MemberListResponse> {
  return api.get<MemberListResponse>(
    `/organizations/${organizationId}/members`,
  );
}
