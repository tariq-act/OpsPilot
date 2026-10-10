import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { job } from './job.js';
import { organization } from './organization.js';
import { technician } from './technician.js';

/**
 * Associates technicians with jobs. Rows are retained for history;
 * release or cancel via status (never hard-delete active history).
 */

export const jobAssignmentStatusEnum = pgEnum('job_assignment_status', [
  'ASSIGNED',
  'RELEASED',
  'CANCELLED',
]);

export const jobAssignment = pgTable.withRLS(
  'job_assignment',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    technicianId: text('technician_id')
      .notNull()
      .references(() => technician.id, { onDelete: 'restrict' }),
    status: jobAssignmentStatusEnum('status').default('ASSIGNED').notNull(),
    assignedBy: text('assigned_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    releasedAt: timestamp('released_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('job_assignment_organizationId_idx').on(table.organizationId),
    index('job_assignment_jobId_idx').on(table.jobId),
    index('job_assignment_technicianId_idx').on(table.technicianId),
    index('job_assignment_status_idx').on(table.status),
    index('job_assignment_assignedAt_idx').on(table.assignedAt),
  ],
);

export type JobAssignment = typeof jobAssignment.$inferSelect;
export type JobAssignmentStatus =
  (typeof jobAssignmentStatusEnum.enumValues)[number];
