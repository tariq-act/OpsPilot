import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { customer } from './customer.js';
import { organization } from './organization.js';

/**
 * Customer service requests (intake). Not jobs yet — no scheduling or assignment.
 * Scoped by `organizationId` for multi-tenant isolation.
 */

export const serviceRequestPriorityEnum = pgEnum('service_request_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

export const serviceRequestStatusEnum = pgEnum('service_request_status', [
  'NEW',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
]);

export const serviceRequestSourceEnum = pgEnum('service_request_source', [
  'PHONE',
  'EMAIL',
  'WEBSITE',
  'WALK_IN',
  'WHATSAPP',
  'OTHER',
]);

export const serviceRequest = pgTable.withRLS(
  'service_request',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    priority: serviceRequestPriorityEnum('priority').default('MEDIUM').notNull(),
    status: serviceRequestStatusEnum('status').default('NEW').notNull(),
    source: serviceRequestSourceEnum('source').default('OTHER').notNull(),
    preferredDate: timestamp('preferred_date'),
    preferredTime: text('preferred_time'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('service_request_organizationId_idx').on(table.organizationId),
    index('service_request_customerId_idx').on(table.customerId),
    index('service_request_status_idx').on(table.status),
    index('service_request_priority_idx').on(table.priority),
    index('service_request_createdAt_idx').on(table.createdAt),
  ],
);

export type ServiceRequest = typeof serviceRequest.$inferSelect;
export type ServiceRequestPriority =
  (typeof serviceRequestPriorityEnum.enumValues)[number];
export type ServiceRequestStatus =
  (typeof serviceRequestStatusEnum.enumValues)[number];
export type ServiceRequestSource =
  (typeof serviceRequestSourceEnum.enumValues)[number];
