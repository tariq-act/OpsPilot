import { and, eq, gt } from 'drizzle-orm';
import { db } from '../index.js';
import { user } from '../schema/auth.js';
import {
  organizationInvitation,
  type OrganizationInvitation,
} from '../schema/invitation.js';
import {
  organizationMember,
  type OrganizationMember,
  type OrganizationMemberRole,
  type OrganizationMemberStatus,
} from '../schema/organization.js';

export const INVITABLE_ROLES = [
  'ADMIN',
  'DISPATCHER',
  'TECHNICIAN',
] as const satisfies readonly OrganizationMemberRole[];

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
] as const satisfies readonly OrganizationMemberRole[];

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

export function isManagerRole(
  role: OrganizationMemberRole,
): role is (typeof MANAGER_ROLES)[number] {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}

export type MemberWithUser = OrganizationMember & {
  userName: string;
  userEmail: string;
};

export async function findActiveMembership(
  organizationId: string,
  userId: string,
): Promise<OrganizationMember | null> {
  const [row] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, userId),
        eq(organizationMember.status, 'ACTIVE'),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listMembersForOrganization(
  organizationId: string,
): Promise<MemberWithUser[]> {
  const rows = await db
    .select({
      id: organizationMember.id,
      organizationId: organizationMember.organizationId,
      userId: organizationMember.userId,
      role: organizationMember.role,
      status: organizationMember.status,
      createdAt: organizationMember.createdAt,
      updatedAt: organizationMember.updatedAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(organizationMember)
    .innerJoin(user, eq(organizationMember.userId, user.id))
    .where(eq(organizationMember.organizationId, organizationId));

  return rows;
}

export async function findMemberInOrganization(
  organizationId: string,
  memberId: string,
): Promise<OrganizationMember | null> {
  const [row] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.id, memberId),
        eq(organizationMember.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateMemberInOrganization(input: {
  organizationId: string;
  memberId: string;
  role?: InvitableRole;
  status?: Extract<OrganizationMemberStatus, 'ACTIVE' | 'SUSPENDED'>;
}): Promise<OrganizationMember | null> {
  const patch: {
    role?: InvitableRole;
    status?: Extract<OrganizationMemberStatus, 'ACTIVE' | 'SUSPENDED'>;
  } = {};
  if (input.role !== undefined) patch.role = input.role;
  if (input.status !== undefined) patch.status = input.status;

  const [row] = await db
    .update(organizationMember)
    .set(patch)
    .where(
      and(
        eq(organizationMember.id, input.memberId),
        eq(organizationMember.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function deleteMemberInOrganization(
  organizationId: string,
  memberId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(organizationMember)
    .where(
      and(
        eq(organizationMember.id, memberId),
        eq(organizationMember.organizationId, organizationId),
      ),
    )
    .returning({ id: organizationMember.id });

  return deleted.length > 0;
}

export async function createInvitation(input: {
  id: string;
  organizationId: string;
  email: string;
  role: InvitableRole;
  token: string;
  invitedByUserId: string;
  expiresAt: Date;
}): Promise<OrganizationInvitation> {
  const [row] = await db
    .insert(organizationInvitation)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      status: 'PENDING',
      token: input.token,
      invitedByUserId: input.invitedByUserId,
      expiresAt: input.expiresAt,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create invitation');
  }
  return row;
}

export async function findPendingInvitationByOrgEmail(
  organizationId: string,
  email: string,
): Promise<OrganizationInvitation | null> {
  const [row] = await db
    .select()
    .from(organizationInvitation)
    .where(
      and(
        eq(organizationInvitation.organizationId, organizationId),
        eq(organizationInvitation.email, email),
        eq(organizationInvitation.status, 'PENDING'),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findInvitationByToken(
  token: string,
): Promise<OrganizationInvitation | null> {
  const [row] = await db
    .select()
    .from(organizationInvitation)
    .where(eq(organizationInvitation.token, token))
    .limit(1);

  return row ?? null;
}

export async function markInvitationExpired(
  invitationId: string,
): Promise<void> {
  await db
    .update(organizationInvitation)
    .set({ status: 'EXPIRED' })
    .where(
      and(
        eq(organizationInvitation.id, invitationId),
        eq(organizationInvitation.status, 'PENDING'),
      ),
    );
}

export async function acceptInvitation(input: {
  invitationId: string;
  organizationId: string;
  userId: string;
  role: InvitableRole;
  membershipId: string;
}): Promise<{ membership: OrganizationMember; invitation: OrganizationInvitation }> {
  return db.transaction(async (tx) => {
    const [membership] = await tx
      .insert(organizationMember)
      .values({
        id: input.membershipId,
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        status: 'ACTIVE',
      })
      .returning();

    if (!membership) {
      throw new Error('Failed to create membership from invitation');
    }

    const [invitation] = await tx
      .update(organizationInvitation)
      .set({
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedUserId: input.userId,
      })
      .where(
        and(
          eq(organizationInvitation.id, input.invitationId),
          eq(organizationInvitation.status, 'PENDING'),
          gt(organizationInvitation.expiresAt, new Date()),
        ),
      )
      .returning();

    if (!invitation) {
      throw new Error('Invitation is no longer pending');
    }

    return { membership, invitation };
  });
}

export async function findMembershipByOrgUser(
  organizationId: string,
  userId: string,
): Promise<OrganizationMember | null> {
  const [row] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}
