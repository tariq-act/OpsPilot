import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';

/**
 * Business identity (multi-tenant root). Future domain tables scope by
 * `organizationId`. RLS is enabled with no policies so Supabase Data API
 * roles are denied by default; the Nest API uses a privileged DATABASE_URL.
 */

export const organizationMemberRoleEnum = pgEnum('organization_member_role', [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
  'TECHNICIAN',
]);

export const organizationMemberStatusEnum = pgEnum(
  'organization_member_status',
  ['ACTIVE', 'INVITED', 'SUSPENDED'],
);

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  timezone: text('timezone').notNull(),
  currency: text('currency').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}).enableRLS();

export const organizationMember = pgTable(
  'organization_member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: organizationMemberRoleEnum('role').notNull(),
    status: organizationMemberStatusEnum('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('organization_member_org_user_uidx').on(
      table.organizationId,
      table.userId,
    ),
    index('organization_member_organizationId_idx').on(table.organizationId),
    index('organization_member_userId_idx').on(table.userId),
  ],
).enableRLS();

export type Organization = typeof organization.$inferSelect;
export type OrganizationMember = typeof organizationMember.$inferSelect;
export type OrganizationMemberRole =
  (typeof organizationMemberRoleEnum.enumValues)[number];
export type OrganizationMemberStatus =
  (typeof organizationMemberStatusEnum.enumValues)[number];
