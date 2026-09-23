import { eq } from 'drizzle-orm';
import { db } from '../index.js';
import {
  organization,
  organizationMember,
  type Organization,
  type OrganizationMember,
} from '../schema/organization.js';

export type OrganizationWithMembership = Organization & {
  role: OrganizationMember['role'];
  membershipStatus: OrganizationMember['status'];
  membershipId: string;
};

export type CreateOrganizationInput = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type CreateOwnerMembershipInput = {
  id: string;
  userId: string;
};

export async function createOrganizationWithOwner(
  orgInput: CreateOrganizationInput,
  membershipInput: CreateOwnerMembershipInput,
): Promise<{ organization: Organization; membership: OrganizationMember }> {
  return db.transaction(async (tx) => {
    const [createdOrg] = await tx
      .insert(organization)
      .values({
        id: orgInput.id,
        name: orgInput.name,
        slug: orgInput.slug,
        timezone: orgInput.timezone,
        currency: orgInput.currency,
        phone: orgInput.phone ?? null,
        email: orgInput.email ?? null,
        address: orgInput.address ?? null,
      })
      .returning();

    if (!createdOrg) {
      throw new Error('Failed to create organization');
    }

    const [createdMembership] = await tx
      .insert(organizationMember)
      .values({
        id: membershipInput.id,
        organizationId: createdOrg.id,
        userId: membershipInput.userId,
        role: 'OWNER',
        status: 'ACTIVE',
      })
      .returning();

    if (!createdMembership) {
      throw new Error('Failed to create organization membership');
    }

    return {
      organization: createdOrg,
      membership: createdMembership,
    };
  });
}

export async function listOrganizationsForUser(
  userId: string,
): Promise<OrganizationWithMembership[]> {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      phone: organization.phone,
      email: organization.email,
      address: organization.address,
      timezone: organization.timezone,
      currency: organization.currency,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      role: organizationMember.role,
      membershipStatus: organizationMember.status,
      membershipId: organizationMember.id,
    })
    .from(organizationMember)
    .innerJoin(
      organization,
      eq(organizationMember.organizationId, organization.id),
    )
    .where(eq(organizationMember.userId, userId));

  return rows;
}
