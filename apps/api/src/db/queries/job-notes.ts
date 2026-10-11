import { and, asc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import { jobNote, type JobNote } from '../schema/job-note.js';

export type CreateJobNoteInput = {
  id: string;
  organizationId: string;
  jobId: string;
  body: string;
  createdBy: string;
};

export type DbExecutor = Pick<typeof db, 'insert' | 'select'>;

export async function createJobNote(
  input: CreateJobNoteInput,
  executor: DbExecutor = db,
): Promise<JobNote> {
  const [row] = await executor
    .insert(jobNote)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      jobId: input.jobId,
      body: input.body,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create job note');
  }
  return row;
}

export async function listNotesForJob(
  organizationId: string,
  jobId: string,
): Promise<JobNote[]> {
  return db
    .select()
    .from(jobNote)
    .where(
      and(
        eq(jobNote.organizationId, organizationId),
        eq(jobNote.jobId, jobId),
      ),
    )
    .orderBy(asc(jobNote.createdAt));
}
