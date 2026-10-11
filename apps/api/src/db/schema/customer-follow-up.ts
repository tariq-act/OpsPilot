import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { customer } from './customer.js';
import { job } from './job.js';
import { organization } from './organization.js';

/**
 * Post-service follow-ups (feedback requests, maintenance reminders).
 * Soft lifecycle via status; rows are not deleted.
 */

export const followUpTypeEnum = pgEnum('follow_up_type', [
  'FEEDBACK',
  'MAINTENANCE_REMINDER',
]);

export const followUpStatusEnum = pgEnum('follow_up_status', [
  'PENDING',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
]);

export const customerFollowUp = pgTable.withRLS(
  'customer_follow_up',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    jobId: text('job_id').references(() => job.id, { onDelete: 'set null' }),
    type: followUpTypeEnum('type').notNull(),
    status: followUpStatusEnum('status').default('PENDING').notNull(),
    dueAt: timestamp('due_at').notNull(),
    notes: text('notes'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('customer_follow_up_organizationId_idx').on(table.organizationId),
    index('customer_follow_up_customerId_idx').on(table.customerId),
    index('customer_follow_up_jobId_idx').on(table.jobId),
    index('customer_follow_up_status_idx').on(table.status),
    index('customer_follow_up_type_idx').on(table.type),
    index('customer_follow_up_dueAt_idx').on(table.dueAt),
  ],
);

export type CustomerFollowUp = typeof customerFollowUp.$inferSelect;
export type FollowUpType = (typeof followUpTypeEnum.enumValues)[number];
export type FollowUpStatus = (typeof followUpStatusEnum.enumValues)[number];
