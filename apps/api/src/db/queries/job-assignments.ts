import { and, eq, inArray, lt, gt, ne, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  jobAssignment,
  type JobAssignment,
  type JobAssignmentStatus,
} from '../schema/job-assignment.js';
import { job } from '../schema/job.js';
import { technician } from '../schema/technician.js';

export type CreateJobAssignmentInput = {
  id: string;
  organizationId: string;
  jobId: string;
  technicianId: string;
  assignedBy: string;
  assignedAt?: Date;
};

export type DbExecutor = Pick<typeof db, 'insert' | 'update' | 'select'>;

export async function createJobAssignment(
  input: CreateJobAssignmentInput,
  executor: DbExecutor = db,
): Promise<JobAssignment> {
  const [row] = await executor
    .insert(jobAssignment)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      jobId: input.jobId,
      technicianId: input.technicianId,
      status: 'ASSIGNED',
      assignedBy: input.assignedBy,
      assignedAt: input.assignedAt ?? new Date(),
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create job assignment');
  }
  return row;
}

export async function listAssignmentsForJob(
  organizationId: string,
  jobId: string,
  status?: JobAssignmentStatus,
): Promise<JobAssignment[]> {
  const conditions: SQL[] = [
    eq(jobAssignment.organizationId, organizationId),
    eq(jobAssignment.jobId, jobId),
  ];
  if (status) {
    conditions.push(eq(jobAssignment.status, status));
  }

  return db
    .select()
    .from(jobAssignment)
    .where(and(...conditions));
}

export async function findAssignmentInOrganization(
  organizationId: string,
  assignmentId: string,
): Promise<JobAssignment | null> {
  const [row] = await db
    .select()
    .from(jobAssignment)
    .where(
      and(
        eq(jobAssignment.id, assignmentId),
        eq(jobAssignment.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findActiveAssignmentForJobTechnician(
  organizationId: string,
  jobId: string,
  technicianId: string,
  executor: DbExecutor = db,
): Promise<JobAssignment | null> {
  const [row] = await executor
    .select()
    .from(jobAssignment)
    .where(
      and(
        eq(jobAssignment.organizationId, organizationId),
        eq(jobAssignment.jobId, jobId),
        eq(jobAssignment.technicianId, technicianId),
        eq(jobAssignment.status, 'ASSIGNED'),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listActiveAssignmentsForJob(
  organizationId: string,
  jobId: string,
  executor: DbExecutor = db,
): Promise<JobAssignment[]> {
  return executor
    .select()
    .from(jobAssignment)
    .where(
      and(
        eq(jobAssignment.organizationId, organizationId),
        eq(jobAssignment.jobId, jobId),
        eq(jobAssignment.status, 'ASSIGNED'),
      ),
    );
}

/**
 * Active assignments for a technician whose job schedule overlaps
 * [scheduledStart, scheduledEnd). Optionally exclude one job (the one being
 * scheduled/assigned).
 */
export async function findOverlappingAssignmentsForTechnician(params: {
  organizationId: string;
  technicianId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  excludeJobId?: string;
  executor?: DbExecutor;
}): Promise<JobAssignment[]> {
  const executor = params.executor ?? db;
  const conditions: SQL[] = [
    eq(jobAssignment.organizationId, params.organizationId),
    eq(jobAssignment.technicianId, params.technicianId),
    eq(jobAssignment.status, 'ASSIGNED'),
    lt(job.scheduledStart, params.scheduledEnd),
    gt(job.scheduledEnd, params.scheduledStart),
  ];

  if (params.excludeJobId) {
    conditions.push(ne(job.id, params.excludeJobId));
  }

  return executor
    .select({
      id: jobAssignment.id,
      organizationId: jobAssignment.organizationId,
      jobId: jobAssignment.jobId,
      technicianId: jobAssignment.technicianId,
      status: jobAssignment.status,
      assignedBy: jobAssignment.assignedBy,
      assignedAt: jobAssignment.assignedAt,
      releasedAt: jobAssignment.releasedAt,
      createdAt: jobAssignment.createdAt,
      updatedAt: jobAssignment.updatedAt,
    })
    .from(jobAssignment)
    .innerJoin(job, eq(job.id, jobAssignment.jobId))
    .where(and(...conditions));
}

export async function updateAssignmentStatusInOrganization(params: {
  organizationId: string;
  assignmentId: string;
  status: JobAssignmentStatus;
  releasedAt?: Date | null;
  executor?: DbExecutor;
}): Promise<JobAssignment | null> {
  const executor = params.executor ?? db;
  const patch: {
    status: JobAssignmentStatus;
    releasedAt?: Date | null;
  } = { status: params.status };

  if (params.releasedAt !== undefined) {
    patch.releasedAt = params.releasedAt;
  }

  const [row] = await executor
    .update(jobAssignment)
    .set(patch)
    .where(
      and(
        eq(jobAssignment.id, params.assignmentId),
        eq(jobAssignment.organizationId, params.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function cancelActiveAssignmentsForJob(
  organizationId: string,
  jobId: string,
  releasedAt: Date,
  executor: DbExecutor = db,
): Promise<JobAssignment[]> {
  return executor
    .update(jobAssignment)
    .set({ status: 'CANCELLED', releasedAt })
    .where(
      and(
        eq(jobAssignment.organizationId, organizationId),
        eq(jobAssignment.jobId, jobId),
        eq(jobAssignment.status, 'ASSIGNED'),
      ),
    )
    .returning();
}

/** Job IDs with an active assignment for the given technician user. */
export async function listJobIdsAssignedToTechnicianUser(
  organizationId: string,
  technicianUserId: string,
): Promise<string[]> {
  const rows = await db
    .select({ jobId: jobAssignment.jobId })
    .from(jobAssignment)
    .innerJoin(
      technician,
      and(
        eq(technician.id, jobAssignment.technicianId),
        eq(technician.organizationId, jobAssignment.organizationId),
      ),
    )
    .where(
      and(
        eq(jobAssignment.organizationId, organizationId),
        eq(jobAssignment.status, 'ASSIGNED'),
        eq(technician.userId, technicianUserId),
      ),
    );

  return [...new Set(rows.map((row) => row.jobId))];
}

export async function listJobIdsForTechnicianInOrganization(
  organizationId: string,
  technicianId: string,
): Promise<string[]> {
  const rows = await db
    .select({ jobId: jobAssignment.jobId })
    .from(jobAssignment)
    .where(
      and(
        eq(jobAssignment.organizationId, organizationId),
        eq(jobAssignment.technicianId, technicianId),
        eq(jobAssignment.status, 'ASSIGNED'),
      ),
    );

  return [...new Set(rows.map((row) => row.jobId))];
}

export async function listCustomerIdsForAssignedJobs(
  organizationId: string,
  jobIds: string[],
): Promise<string[]> {
  if (jobIds.length === 0) return [];

  const rows = await db
    .select({ customerId: job.customerId })
    .from(job)
    .where(
      and(eq(job.organizationId, organizationId), inArray(job.id, jobIds)),
    );

  return [...new Set(rows.map((row) => row.customerId))];
}

export async function listRequestIdsForAssignedJobs(
  organizationId: string,
  jobIds: string[],
): Promise<string[]> {
  if (jobIds.length === 0) return [];

  const rows = await db
    .select({ requestId: job.requestId })
    .from(job)
    .where(
      and(eq(job.organizationId, organizationId), inArray(job.id, jobIds)),
    );

  return [...new Set(rows.map((row) => row.requestId))];
}
