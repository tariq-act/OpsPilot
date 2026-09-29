import type {
  OrganizationInvitationStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
} from '../../db/schema/index.js';

export class OrganizationDto {
  id!: string;
  name!: string;
  slug!: string;
  logo!: string | null;
  phone!: string | null;
  email!: string | null;
  address!: string | null;
  timezone!: string;
  currency!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class OrganizationMembershipSummaryDto {
  id!: string;
  role!: OrganizationMemberRole;
  status!: OrganizationMemberStatus;
}

export class CreateOrganizationResponseDto {
  organization!: OrganizationDto;
  membership!: OrganizationMembershipSummaryDto;
}

export class OrganizationListItemDto extends OrganizationDto {
  role!: OrganizationMemberRole;
  membershipStatus!: OrganizationMemberStatus;
  membershipId!: string;
}

export class OrganizationListResponseDto {
  organizations!: OrganizationListItemDto[];
}

export class InvitationDto {
  id!: string;
  organizationId!: string;
  email!: string;
  role!: OrganizationMemberRole;
  status!: OrganizationInvitationStatus;
  token!: string;
  expiresAt!: Date;
  createdAt!: Date;
}

export class CreateInvitationResponseDto {
  invitation!: InvitationDto;
}

export class MemberDto {
  id!: string;
  organizationId!: string;
  userId!: string;
  role!: OrganizationMemberRole;
  status!: OrganizationMemberStatus;
  createdAt!: Date;
  updatedAt!: Date;
  userName!: string;
  userEmail!: string;
}

export class MemberListResponseDto {
  members!: MemberDto[];
}

export class UpdatedMemberDto {
  id!: string;
  organizationId!: string;
  userId!: string;
  role!: OrganizationMemberRole;
  status!: OrganizationMemberStatus;
  updatedAt!: Date;
}

export class UpdateMemberResponseDto {
  member!: UpdatedMemberDto;
}

export class RemoveMemberResponseDto {
  success!: boolean;
}

export class AcceptedMembershipDto {
  id!: string;
  organizationId!: string;
  userId!: string;
  role!: OrganizationMemberRole;
  status!: OrganizationMemberStatus;
}

export class AcceptedInvitationDto {
  id!: string;
  status!: OrganizationInvitationStatus;
  acceptedAt!: Date | null;
}

export class AcceptInvitationResponseDto {
  membership!: AcceptedMembershipDto;
  invitation!: AcceptedInvitationDto;
}
