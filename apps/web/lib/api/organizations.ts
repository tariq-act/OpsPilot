/**
 * Typed API resource functions — organizations.
 * All calls go through the centralized api client in lib/api.ts.
 */

import { api } from "@/lib/api";
import type {
  CreateOrganizationResponse,
  MemberListResponse,
  OrganizationListResponse,
  Organization,
  Invitation,
  CreateInvitationResponse,
  Member,
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

export type OrganizationSettingsInput = Partial<
  Pick<
    Organization,
    | "name"
    | "slug"
    | "logo"
    | "phone"
    | "email"
    | "address"
    | "timezone"
    | "currency"
  >
>;
export type TeamRole = Exclude<Member["role"], "OWNER">;
export type MemberUpdate = { role?: TeamRole; status?: "ACTIVE" | "SUSPENDED" };
export type InvitationSummary = Omit<Invitation, "token"> & {
  currentRole: Member["role"] | null;
};

export function updateOrganization(
  id: string,
  data: OrganizationSettingsInput,
) {
  return api.patch<{ organization: Organization }>(
    `/organizations/${id}`,
    data,
  );
}

export function createInvitation(
  id: string,
  data: { email: string; role: TeamRole },
) {
  return api.post<CreateInvitationResponse>(
    `/organizations/${id}/invitations`,
    data,
  );
}

export function listInvitations(id: string) {
  return api.get<{ invitations: InvitationSummary[] }>(
    `/organizations/${id}/invitations`,
  );
}

export function revokeInvitation(id: string, invitationId: string) {
  return api.delete<{ success: boolean }>(
    `/organizations/${id}/invitations/${invitationId}`,
  );
}

export function updateMember(id: string, memberId: string, data: MemberUpdate) {
  return api.patch<{
    member: Pick<
      Member,
      "id" | "organizationId" | "userId" | "role" | "status" | "updatedAt"
    >;
  }>(`/organizations/${id}/members/${memberId}`, data);
}

export function removeMember(id: string, memberId: string) {
  return api.delete<{ success: boolean }>(
    `/organizations/${id}/members/${memberId}`,
  );
}

/** List organizations where the signed-in user is an active member. */
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
