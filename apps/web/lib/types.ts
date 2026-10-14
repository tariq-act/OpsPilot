/**
 * Shared API types that mirror the NestJS backend response DTOs.
 * Keep these in sync with apps/api/src when the API evolves.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export type MemberRole = "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN";
export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationListItem extends Organization {
  role: MemberRole;
  membershipStatus: MemberStatus;
  membershipId: string;
}

export interface OrganizationListResponse {
  organizations: OrganizationListItem[];
}

export interface MembershipSummary {
  id: string;
  role: MemberRole;
  status: MemberStatus;
}

export interface CreateOrganizationResponse {
  organization: Organization;
  membership: MembershipSummary;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
}

export interface MemberListResponse {
  members: Member[];
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: MemberRole;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInvitationResponse {
  invitation: Invitation;
}

export interface AcceptInvitationResponse {
  membership: {
    id: string;
    organizationId: string;
    userId: string;
    role: MemberRole;
    status: MemberStatus;
  };
  invitation: {
    id: string;
    status: InvitationStatus;
    acceptedAt: string | null;
  };
}

// ---------------------------------------------------------------------------
// API error shape (matches NestJS HttpException body)
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error: string;
}
