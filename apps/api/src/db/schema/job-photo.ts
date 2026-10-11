import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { job } from './job.js';
import { organization } from './organization.js';

/**
 * Before/after (or other) photos for a job. Binary bytes live in FileStorage;
 * this row holds metadata and the storage key.
 */

export const jobPhotoKindEnum = pgEnum('job_photo_kind', [
  'BEFORE',
  'AFTER',
  'OTHER',
]);

export const jobPhoto = pgTable.withRLS(
  'job_photo',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    kind: jobPhotoKindEnum('kind').notNull(),
    storageKey: text('storage_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('job_photo_organizationId_idx').on(table.organizationId),
    index('job_photo_jobId_idx').on(table.jobId),
    index('job_photo_kind_idx').on(table.kind),
    index('job_photo_createdAt_idx').on(table.createdAt),
  ],
);

export type JobPhoto = typeof jobPhoto.$inferSelect;
export type JobPhotoKind = (typeof jobPhotoKindEnum.enumValues)[number];
