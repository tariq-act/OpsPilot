import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { job, jobStatusEnum } from './job.js';
import { organization } from './organization.js';

/**
 * Append-only execution audit trail: who did what and when.
 */

export const jobActivityActionEnum = pgEnum('job_activity_action', [
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'PHOTO_UPLOADED',
  'COMPLETED',
]);

export const jobActivity = pgTable.withRLS(
  'job_activity',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    action: jobActivityActionEnum('action').notNull(),
    fromStatus: jobStatusEnum('from_status'),
    toStatus: jobStatusEnum('to_status'),
    message: text('message'),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('job_activity_organizationId_idx').on(table.organizationId),
    index('job_activity_jobId_idx').on(table.jobId),
    index('job_activity_createdAt_idx').on(table.createdAt),
    index('job_activity_action_idx').on(table.action),
  ],
);

export type JobActivity = typeof jobActivity.$inferSelect;
export type JobActivityAction =
  (typeof jobActivityActionEnum.enumValues)[number];
