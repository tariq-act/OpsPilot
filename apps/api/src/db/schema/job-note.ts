import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { job } from './job.js';
import { organization } from './organization.js';

/**
 * Work notes added during job execution. Append-only history.
 */

export const jobNote = pgTable.withRLS(
  'job_note',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('job_note_organizationId_idx').on(table.organizationId),
    index('job_note_jobId_idx').on(table.jobId),
    index('job_note_createdAt_idx').on(table.createdAt),
  ],
);

export type JobNote = typeof jobNote.$inferSelect;
