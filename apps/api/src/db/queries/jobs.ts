import { and, eq, gt, inArray, lt, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  job,
  type Job,
  type JobPriority,
  type JobStatus,
} from '../schema/job.js';
import { listJobIdsAssignedToTechnicianUser } from './job-assignments.js';

export type CreateJobInput = {
  id: string;
  organizationId: string;
  customerId: string;
  requestId: string;
  title: string;
  description?: string | null;
  priority: JobPriority;
  location?: string | null;
  estimatedDuration?: number | null;
  createdBy: string;
};

export type UpdateJobInput = {
  organizationId: string;
  jobId: string;
  title?: string;
  description?: string | null;
  priority?: JobPriority;
  status?: JobStatus;
  location?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimatedDuration?: number | null;
  actualStart?: Date | null;
  actualEnd?: Date | null;
  completedAt?: Date | null;
};

export type ListJobsFilter = {
  organizationId: string;
  status?: JobStatus;
  priority?: JobPriority;
  customerId?: string;
  requestId?: string;
  /** Inclusive window start; jobs overlapping [fromDate, toDate] by schedule. */
  fromDate?: Date;
  toDate?: Date;
  technicianId?: string;
  ids?: string[];
};

export type DbExecutor = Pick<typeof db, 'insert' | 'update' | 'select'>;

export async function createJob(input: CreateJobInput): Promise<Job> {
  const [row] = await db
    .insert(job)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      requestId: input.requestId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      status: 'DRAFT',
      location: input.location ?? null,
      estimatedDuration: input.estimatedDuration ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create job');
  }
  return row;
}

export async function listJobsForOrganization(
  filter: ListJobsFilter,
): Promise<Job[]> {
  const conditions: SQL[] = [eq(job.organizationId, filter.organizationId)];

  if (filter.status) {
    conditions.push(eq(job.status, filter.status));
  }
  if (filter.priority) {
    conditions.push(eq(job.priority, filter.priority));
  }
  if (filter.customerId) {
    conditions.push(eq(job.customerId, filter.customerId));
  }
  if (filter.requestId) {
    conditions.push(eq(job.requestId, filter.requestId));
  }
  if (filter.fromDate) {
    // Overlap: scheduledEnd > fromDate (null schedule excluded).
    conditions.push(gt(job.scheduledEnd, filter.fromDate));
  }
  if (filter.toDate) {
    // Overlap: scheduledStart < toDate (null schedule excluded).
    conditions.push(lt(job.scheduledStart, filter.toDate));
  }
  if (filter.ids !== undefined) {
    if (filter.ids.length === 0) {
      return [];
    }
    conditions.push(inArray(job.id, filter.ids));
  }

  return db
    .select()
    .from(job)
    .where(and(...conditions));
}

export async function findJobInOrganization(
  organizationId: string,
  jobId: string,
  executor: DbExecutor = db,
): Promise<Job | null> {
  const [row] = await executor
    .select()
    .from(job)
    .where(and(eq(job.id, jobId), eq(job.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

export async function findJobByRequestId(
  organizationId: string,
  requestId: string,
): Promise<Job | null> {
  const [row] = await db
    .select()
    .from(job)
    .where(
      and(
        eq(job.requestId, requestId),
        eq(job.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateJobInOrganization(
  input: UpdateJobInput,
  executor: DbExecutor = db,
): Promise<Job | null> {
  const patch: {
    title?: string;
    description?: string | null;
    priority?: JobPriority;
    status?: JobStatus;
    location?: string | null;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
    estimatedDuration?: number | null;
    actualStart?: Date | null;
    actualEnd?: Date | null;
    completedAt?: Date | null;
  } = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.location !== undefined) patch.location = input.location;
  if (input.scheduledStart !== undefined) {
    patch.scheduledStart = input.scheduledStart;
  }
  if (input.scheduledEnd !== undefined) {
    patch.scheduledEnd = input.scheduledEnd;
  }
  if (input.estimatedDuration !== undefined) {
    patch.estimatedDuration = input.estimatedDuration;
  }
  if (input.actualStart !== undefined) patch.actualStart = input.actualStart;
  if (input.actualEnd !== undefined) patch.actualEnd = input.actualEnd;
  if (input.completedAt !== undefined) patch.completedAt = input.completedAt;

  const [row] = await executor
    .update(job)
    .set(patch)
    .where(
      and(
        eq(job.id, input.jobId),
        eq(job.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

/** Soft cancel: set status to CANCELLED. */
export async function cancelJobInOrganization(
  organizationId: string,
  jobId: string,
): Promise<Job | null> {
  const [row] = await db
    .update(job)
    .set({ status: 'CANCELLED' })
    .where(and(eq(job.id, jobId), eq(job.organizationId, organizationId)))
    .returning();

  return row ?? null;
}

/**
 * Job IDs a technician may view/update via active assignment.
 */
export async function listTechnicianVisibleJobIds(
  organizationId: string,
  technicianUserId: string,
): Promise<string[]> {
  return listJobIdsAssignedToTechnicianUser(organizationId, technicianUserId);
}
