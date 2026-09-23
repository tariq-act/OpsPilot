import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { organization } from './organization.js';

/**
 * Organization-owned customer records (business contacts, not auth users).
 * Scoped by `organizationId` for multi-tenant isolation.
 */

export const customerStatusEnum = pgEnum('customer_status', [
  'ACTIVE',
  'INACTIVE',
]);

export const customer = pgTable.withRLS(
  'customer',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postal_code'),
    notes: text('notes'),
    status: customerStatusEnum('status').default('ACTIVE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('customer_organizationId_idx').on(table.organizationId),
    index('customer_phone_idx').on(table.phone),
    index('customer_email_idx').on(table.email),
  ],
);

export type Customer = typeof customer.$inferSelect;
export type CustomerStatus = (typeof customerStatusEnum.enumValues)[number];
