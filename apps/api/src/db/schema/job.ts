import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { customer } from './customer.js';
import { organization } from './organization.js';
import { serviceRequest } from './service-request.js';

/**
 * Operational jobs (usually created from an ACCEPTED service request).
 * Scheduling and technician assignment come later. Soft-cancel via status.
 */

export const jobPriorityEnum = pgEnum('job_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'DRAFT',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const job = pgTable.withRLS(
  'job',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    requestId: text('request_id')
      .notNull()
      .references(() => serviceRequest.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description'),
    priority: jobPriorityEnum('priority').default('MEDIUM').notNull(),
    status: jobStatusEnum('status').default('DRAFT').notNull(),
    location: text('location'),
    estimatedDuration: integer('estimated_duration'),
    actualStart: timestamp('actual_start'),
    actualEnd: timestamp('actual_end'),
    completedAt: timestamp('completed_at'),
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
    // One job per service request.
    unique('job_request_uidx').on(table.requestId),
    index('job_organizationId_idx').on(table.organizationId),
    index('job_customerId_idx').on(table.customerId),
    index('job_status_idx').on(table.status),
    index('job_priority_idx').on(table.priority),
    index('job_createdAt_idx').on(table.createdAt),
  ],
);

export type Job = typeof job.$inferSelect;
export type JobPriority = (typeof jobPriorityEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
