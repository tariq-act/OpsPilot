import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import {
  organization,
  organizationMemberRoleEnum,
} from './organization.js';

/**
 * Team invitations. Invitees become organization_member rows only after accept.
 * Role is constrained in app code to ADMIN | DISPATCHER | TECHNICIAN (never OWNER).
 */

export const organizationInvitationStatusEnum = pgEnum(
  'organization_invitation_status',
  ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
);

export const organizationInvitation = pgTable.withRLS(
  'organization_invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: organizationMemberRoleEnum('role').notNull(),
    status: organizationInvitationStatusEnum('status')
      .default('PENDING')
      .notNull(),
    token: text('token').notNull().unique(),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    acceptedUserId: text('accepted_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('organization_invitation_organizationId_idx').on(
      table.organizationId,
    ),
    index('organization_invitation_email_idx').on(table.email),
    // One PENDING invite per organization + email.
    uniqueIndex('organization_invitation_org_email_pending_uidx')
      .on(table.organizationId, table.email)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);

export type OrganizationInvitation =
  typeof organizationInvitation.$inferSelect;
export type OrganizationInvitationStatus =
  (typeof organizationInvitationStatusEnum.enumValues)[number];
