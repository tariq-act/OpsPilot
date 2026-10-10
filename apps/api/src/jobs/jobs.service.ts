import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  cancelActiveAssignmentsForJob,
  createJob,
  createJobAssignment,
  findActiveAssignmentForJobTechnician,
  findActiveMembership,
  findAssignmentInOrganization,
  findCustomerInOrganization,
  findJobByRequestId,
  findJobInOrganization,
  findOverlappingAssignmentsForTechnician,
  findServiceRequestInOrganization,
  findTechnicianInOrganization,
  listActiveAssignmentsForJob,
  listAssignmentsForJob,
  listJobIdsForTechnicianInOrganization,
  listJobsForOrganization,
  listTechnicianVisibleJobIds,
  updateAssignmentStatusInOrganization,
  updateJobInOrganization,
} from '../db/queries/index.js';
import { db } from '../db/index.js';
import type { JobAssignment } from '../db/schema/job-assignment.js';
import type { Job, JobPriority } from '../db/schema/job.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import { canTransitionAssignmentStatus } from './assignment-status.js';
import type {
  AssignTechniciansDto,
  ReassignTechnicianDto,
} from './dto/assign-technicians.dto.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { ListJobsQueryDto } from './dto/list-jobs-query.dto.js';
import type { ScheduleJobDto } from './dto/schedule-job.dto.js';
import type { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import type { UpdateJobDto } from './dto/update-job.dto.js';
import { canTransitionJobStatus } from './job-status.js';

const JOB_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

type JobManagerRole = (typeof JOB_MANAGER_ROLES)[number];

function isJobManagerRole(
  role: OrganizationMemberRole,
): role is JobManagerRole {
  return (JOB_MANAGER_ROLES as readonly string[]).includes(role);
}

function toJobDto(row: Job) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    requestId: row.requestId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    location: row.location,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    estimatedDuration: row.estimatedDuration,
    actualStart: row.actualStart,
    actualEnd: row.actualEnd,
    completedAt: row.completedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAssignmentDto(row: JobAssignment) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    technicianId: row.technicianId,
    status: row.status,
    assignedBy: row.assignedBy,
    assignedAt: row.assignedAt,
    releasedAt: row.releasedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseRequiredDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      statusCode: 400,
      message: `Invalid ${field} value`,
      error: 'Bad Request',
    });
  }
  return date;
}

function parseOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'Invalid date value',
      error: 'Bad Request',
    });
  }
  return date;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function mapServiceRequestPriority(priority: string): JobPriority {
  if (
    priority === 'LOW' ||
    priority === 'MEDIUM' ||
    priority === 'HIGH' ||
    priority === 'URGENT'
  ) {
    return priority;
  }
  return 'MEDIUM';
}

function assertSchedulableStatus(status: Job['status']): void {
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    throw new ConflictException({
      statusCode: 409,
      message: `Cannot schedule a job in status ${status}`,
      error: 'Conflict',
    });
  }
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateJobDto,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const customer = await findCustomerInOrganization(
      organizationId,
      dto.customerId,
    );
    if (!customer || customer.status !== 'ACTIVE') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Customer not found in this organization',
        error: 'Bad Request',
      });
    }

    const request = await findServiceRequestInOrganization(
      organizationId,
      dto.requestId,
    );
    if (!request) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Service request not found in this organization',
        error: 'Bad Request',
      });
    }

    if (request.status !== 'ACCEPTED') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Service request must be ACCEPTED before creating a job',
        error: 'Bad Request',
      });
    }

    if (request.customerId !== dto.customerId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Customer does not match the service request',
        error: 'Bad Request',
      });
    }

    const existingJob = await findJobByRequestId(organizationId, dto.requestId);
    if (existingJob) {
      throw new ConflictException({
        statusCode: 409,
        message: 'A job already exists for this service request',
        error: 'Conflict',
      });
    }

    try {
      const created = await createJob({
        id: randomUUID(),
        organizationId,
        customerId: dto.customerId,
        requestId: dto.requestId,
        title: dto.title ?? request.title,
        description: dto.description ?? request.description,
        priority: dto.priority ?? mapServiceRequestPriority(request.priority),
        location: dto.location ?? null,
        estimatedDuration: dto.estimatedDuration ?? null,
        createdBy: actorUserId,
      });

      return { job: toJobDto(created) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'A job already exists for this service request',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to create job', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create job',
        error: 'Internal Server Error',
      });
    }
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListJobsQueryDto,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    if (query.fromDate && query.toDate) {
      const from = new Date(query.fromDate);
      const to = new Date(query.toDate);
      if (from > to) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'fromDate must be before or equal to toDate',
          error: 'Bad Request',
        });
      }
    }

    let technicianScopedIds: string[] | undefined;
    if (query.technicianId) {
      if (!isJobManagerRole(membership.role)) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Only owners, admins, and dispatchers can filter by technician',
          error: 'Forbidden',
        });
      }
      const tech = await findTechnicianInOrganization(
        organizationId,
        query.technicianId,
      );
      if (!tech) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Technician not found in this organization',
          error: 'Bad Request',
        });
      }
      technicianScopedIds = await listJobIdsForTechnicianInOrganization(
        organizationId,
        query.technicianId,
      );
    }

    const baseFilter = {
      organizationId,
      status: query.status,
      priority: query.priority,
      customerId: query.customerId,
      requestId: query.requestId,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    };

    if (isJobManagerRole(membership.role)) {
      const rows = await listJobsForOrganization({
        ...baseFilter,
        ids: technicianScopedIds,
      });
      return { jobs: rows.map(toJobDto) };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleJobIds(
        organizationId,
        actorUserId,
      );
      const rows = await listJobsForOrganization({
        ...baseFilter,
        ids: visibleIds,
      });
      return { jobs: rows.map(toJobDto) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view jobs',
      error: 'Forbidden',
    });
  }

  async getById(actorUserId: string, organizationId: string, jobId: string) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    const row = await findJobInOrganization(organizationId, jobId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (isJobManagerRole(membership.role)) {
      return { job: toJobDto(row) };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleJobIds(
        organizationId,
        actorUserId,
      );
      if (!visibleIds.includes(row.id)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Job not found',
          error: 'Not Found',
        });
      }
      return { job: toJobDto(row) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view jobs',
      error: 'Forbidden',
    });
  }

  async update(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: UpdateJobDto,
  ) {
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.priority === undefined &&
      dto.status === undefined &&
      dto.location === undefined &&
      dto.estimatedDuration === undefined &&
      dto.actualStart === undefined &&
      dto.actualEnd === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one field is required',
        error: 'Bad Request',
      });
    }

    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (isJobManagerRole(membership.role)) {
      // Managers may update any job in the org.
    } else if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleJobIds(
        organizationId,
        actorUserId,
      );
      if (!visibleIds.includes(existing.id)) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Not allowed to update this job',
          error: 'Forbidden',
        });
      }
    } else {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not allowed to update jobs',
        error: 'Forbidden',
      });
    }

    if (
      dto.status !== undefined &&
      !canTransitionJobStatus(existing.status, dto.status)
    ) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot change status from ${existing.status} to ${dto.status}`,
        error: 'Conflict',
      });
    }

    const nextStatus = dto.status;
    const now = new Date();
    let actualStart = parseOptionalDate(dto.actualStart);
    let actualEnd = parseOptionalDate(dto.actualEnd);
    let completedAt: Date | null | undefined = undefined;

    if (nextStatus === 'IN_PROGRESS' && existing.actualStart == null) {
      if (actualStart === undefined) actualStart = now;
    }
    if (nextStatus === 'COMPLETED') {
      if (actualEnd === undefined && existing.actualEnd == null) {
        actualEnd = now;
      }
      if (existing.completedAt == null) {
        completedAt = now;
      }
      if (actualStart === undefined && existing.actualStart == null) {
        actualStart = now;
      }
    }

    const updated = await updateJobInOrganization({
      organizationId,
      jobId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      status: dto.status,
      location: dto.location,
      estimatedDuration: dto.estimatedDuration,
      actualStart,
      actualEnd,
      completedAt,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    return { job: toJobDto(updated) };
  }

  async softCancel(
    actorUserId: string,
    organizationId: string,
    jobId: string,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (!canTransitionJobStatus(existing.status, 'CANCELLED')) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot cancel a job in status ${existing.status}`,
        error: 'Conflict',
      });
    }

    if (existing.status === 'CANCELLED') {
      return { job: toJobDto(existing) };
    }

    const now = new Date();
    const updated = await db.transaction(async (tx) => {
      const cancelled = await updateJobInOrganization(
        {
          organizationId,
          jobId,
          status: 'CANCELLED',
        },
        tx,
      );
      if (!cancelled) {
        return null;
      }
      await cancelActiveAssignmentsForJob(organizationId, jobId, now, tx);
      return cancelled;
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    return { job: toJobDto(updated) };
  }

  async schedule(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: ScheduleJobDto,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    assertSchedulableStatus(existing.status);

    const scheduledStart = parseRequiredDate(
      dto.scheduledStart,
      'scheduledStart',
    );
    const scheduledEnd = parseRequiredDate(dto.scheduledEnd, 'scheduledEnd');
    if (scheduledStart >= scheduledEnd) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'scheduledStart must be before scheduledEnd',
        error: 'Bad Request',
      });
    }

    let nextStatus: Job['status'] | undefined;
    if (existing.status === 'DRAFT') {
      if (!canTransitionJobStatus('DRAFT', 'CONFIRMED')) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Cannot confirm job for scheduling',
          error: 'Conflict',
        });
      }
      nextStatus = 'CONFIRMED';
    }

    const updated = await updateJobInOrganization({
      organizationId,
      jobId,
      scheduledStart,
      scheduledEnd,
      location: dto.location !== undefined ? dto.location : undefined,
      status: nextStatus,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    return { job: toJobDto(updated) };
  }

  async reschedule(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: ScheduleJobDto,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    assertSchedulableStatus(existing.status);

    if (existing.scheduledStart == null || existing.scheduledEnd == null) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Job is not scheduled yet; use schedule instead',
        error: 'Bad Request',
      });
    }

    const scheduledStart = parseRequiredDate(
      dto.scheduledStart,
      'scheduledStart',
    );
    const scheduledEnd = parseRequiredDate(dto.scheduledEnd, 'scheduledEnd');
    if (scheduledStart >= scheduledEnd) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'scheduledStart must be before scheduledEnd',
        error: 'Bad Request',
      });
    }

    if (dto.allowOverlap !== true) {
      const activeAssignments = await listActiveAssignmentsForJob(
        organizationId,
        jobId,
      );
      for (const assignment of activeAssignments) {
        const overlaps = await findOverlappingAssignmentsForTechnician({
          organizationId,
          technicianId: assignment.technicianId,
          scheduledStart,
          scheduledEnd,
          excludeJobId: jobId,
        });
        if (overlaps.length > 0) {
          throw new ConflictException({
            statusCode: 409,
            message: `Reschedule would overlap assignments for technician ${assignment.technicianId}`,
            error: 'Conflict',
          });
        }
      }
    }

    const updated = await updateJobInOrganization({
      organizationId,
      jobId,
      scheduledStart,
      scheduledEnd,
      location: dto.location !== undefined ? dto.location : undefined,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    return { job: toJobDto(updated) };
  }

  async assignTechnicians(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: AssignTechniciansDto,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    assertSchedulableStatus(existing.status);

    if (existing.scheduledStart == null || existing.scheduledEnd == null) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Schedule the job before assigning technicians',
        error: 'Bad Request',
      });
    }

    const allowOverlap = dto.allowOverlap === true;
    const assignments: JobAssignment[] = [];

    try {
      await db.transaction(async (tx) => {
        for (const technicianId of dto.technicianIds) {
          const tech = await findTechnicianInOrganization(
            organizationId,
            technicianId,
          );
          if (!tech) {
            throw new BadRequestException({
              statusCode: 400,
              message: `Technician ${technicianId} not found in this organization`,
              error: 'Bad Request',
            });
          }
          if (tech.status !== 'ACTIVE') {
            throw new BadRequestException({
              statusCode: 400,
              message: `Technician ${technicianId} is not ACTIVE`,
              error: 'Bad Request',
            });
          }

          const alreadyActive = await findActiveAssignmentForJobTechnician(
            organizationId,
            jobId,
            technicianId,
            tx,
          );
          if (alreadyActive) {
            assignments.push(alreadyActive);
            continue;
          }

          if (!allowOverlap) {
            const overlaps = await findOverlappingAssignmentsForTechnician({
              organizationId,
              technicianId,
              scheduledStart: existing.scheduledStart!,
              scheduledEnd: existing.scheduledEnd!,
              excludeJobId: jobId,
              executor: tx,
            });
            if (overlaps.length > 0) {
              throw new ConflictException({
                statusCode: 409,
                message: `Technician ${technicianId} has overlapping assignments`,
                error: 'Conflict',
              });
            }
          }

          const created = await createJobAssignment(
            {
              id: randomUUID(),
              organizationId,
              jobId,
              technicianId,
              assignedBy: actorUserId,
            },
            tx,
          );
          assignments.push(created);
        }
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to assign technicians', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to assign technicians',
        error: 'Internal Server Error',
      });
    }

    const jobRow = await findJobInOrganization(organizationId, jobId);
    if (!jobRow) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    return {
      job: toJobDto(jobRow),
      assignments: assignments.map(toAssignmentDto),
    };
  }

  async listAssignments(
    actorUserId: string,
    organizationId: string,
    jobId: string,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleJobIds(
        organizationId,
        actorUserId,
      );
      if (!visibleIds.includes(existing.id)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Job not found',
          error: 'Not Found',
        });
      }
    } else if (!isJobManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not allowed to view assignments',
        error: 'Forbidden',
      });
    }

    const rows = await listAssignmentsForJob(organizationId, jobId);
    return { assignments: rows.map(toAssignmentDto) };
  }

  async reassignTechnician(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    assignmentId: string,
    dto: ReassignTechnicianDto,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    assertSchedulableStatus(existing.status);

    if (existing.scheduledStart == null || existing.scheduledEnd == null) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Schedule the job before reassigning technicians',
        error: 'Bad Request',
      });
    }

    const current = await findAssignmentInOrganization(
      organizationId,
      assignmentId,
    );
    if (!current || current.jobId !== jobId) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Assignment not found',
        error: 'Not Found',
      });
    }

    if (current.status !== 'ASSIGNED') {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot reassign an assignment in status ${current.status}`,
        error: 'Conflict',
      });
    }

    if (current.technicianId === dto.technicianId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Technician is already assigned on this assignment',
        error: 'Bad Request',
      });
    }

    const tech = await findTechnicianInOrganization(
      organizationId,
      dto.technicianId,
    );
    if (!tech) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Technician not found in this organization',
        error: 'Bad Request',
      });
    }
    if (tech.status !== 'ACTIVE') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Technician is not ACTIVE',
        error: 'Bad Request',
      });
    }

    const allowOverlap = dto.allowOverlap === true;
    const now = new Date();

    try {
      const result = await db.transaction(async (tx) => {
        if (!canTransitionAssignmentStatus(current.status, 'RELEASED')) {
          throw new ConflictException({
            statusCode: 409,
            message: `Cannot release assignment in status ${current.status}`,
            error: 'Conflict',
          });
        }

        const existingActive = await findActiveAssignmentForJobTechnician(
          organizationId,
          jobId,
          dto.technicianId,
          tx,
        );
        if (existingActive) {
          throw new ConflictException({
            statusCode: 409,
            message: 'Technician is already assigned to this job',
            error: 'Conflict',
          });
        }

        if (!allowOverlap) {
          const overlaps = await findOverlappingAssignmentsForTechnician({
            organizationId,
            technicianId: dto.technicianId,
            scheduledStart: existing.scheduledStart!,
            scheduledEnd: existing.scheduledEnd!,
            excludeJobId: jobId,
            executor: tx,
          });
          if (overlaps.length > 0) {
            throw new ConflictException({
              statusCode: 409,
              message: 'Technician has overlapping assignments',
              error: 'Conflict',
            });
          }
        }

        const released = await updateAssignmentStatusInOrganization({
          organizationId,
          assignmentId,
          status: 'RELEASED',
          releasedAt: now,
          executor: tx,
        });
        if (!released) {
          throw new NotFoundException({
            statusCode: 404,
            message: 'Assignment not found',
            error: 'Not Found',
          });
        }

        const created = await createJobAssignment(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            technicianId: dto.technicianId,
            assignedBy: actorUserId,
            assignedAt: now,
          },
          tx,
        );

        return { released, assignment: created };
      });

      return {
        job: toJobDto(existing),
        released: toAssignmentDto(result.released),
        assignment: toAssignmentDto(result.assignment),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Failed to reassign technician', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to reassign technician',
        error: 'Internal Server Error',
      });
    }
  }

  async updateAssignment(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
  ) {
    await this.requireJobManager(organizationId, actorUserId);

    const existing = await findJobInOrganization(organizationId, jobId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    const current = await findAssignmentInOrganization(
      organizationId,
      assignmentId,
    );
    if (!current || current.jobId !== jobId) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Assignment not found',
        error: 'Not Found',
      });
    }

    if (!canTransitionAssignmentStatus(current.status, dto.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot change assignment status from ${current.status} to ${dto.status}`,
        error: 'Conflict',
      });
    }

    if (current.status === dto.status) {
      return { assignment: toAssignmentDto(current) };
    }

    const updated = await updateAssignmentStatusInOrganization({
      organizationId,
      assignmentId,
      status: dto.status,
      releasedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Assignment not found',
        error: 'Not Found',
      });
    }

    return { assignment: toAssignmentDto(updated) };
  }

  private async requireActiveMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await findActiveMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not a member of this organization',
        error: 'Forbidden',
      });
    }
    return membership;
  }

  private async requireJobManager(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isJobManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only owners, admins, and dispatchers can manage jobs',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
