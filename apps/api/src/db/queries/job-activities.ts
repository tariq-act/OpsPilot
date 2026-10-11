import { and, asc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import {
  jobActivity,
  type JobActivity,
  type JobActivityAction,
} from '../schema/job-activity.js';
import type { JobStatus } from '../schema/job.js';

export type CreateJobActivityInput = {
  id: string;
  organizationId: string;
  jobId: string;
  action: JobActivityAction;
  actorUserId: string;
  fromStatus?: JobStatus | null;
  toStatus?: JobStatus | null;
  message?: string | null;
};

export type DbExecutor = Pick<typeof db, 'insert' | 'select'>;

export async function createJobActivity(
  input: CreateJobActivityInput,
  executor: DbExecutor = db,
): Promise<JobActivity> {
  const [row] = await executor
    .insert(jobActivity)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      jobId: input.jobId,
      action: input.action,
      actorUserId: input.actorUserId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      message: input.message ?? null,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create job activity');
  }
  return row;
}

export async function listActivitiesForJob(
  organizationId: string,
  jobId: string,
): Promise<JobActivity[]> {
  return db
    .select()
    .from(jobActivity)
    .where(
      and(
        eq(jobActivity.organizationId, organizationId),
        eq(jobActivity.jobId, jobId),
      ),
    )
    .orderBy(asc(jobActivity.createdAt));
}
