import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  cancelActiveAssignmentsForJob,
  createJob,
  createJobActivity,
  createJobAssignment,
  createJobNote,
  createJobPhoto,
  findActiveAssignmentForJobTechnician,
  findActiveMembership,
  findAssignmentInOrganization,
  findCustomerInOrganization,
  findJobByRequestId,
  findJobInOrganization,
  findOverlappingAssignmentsForTechnician,
  findPhotoInOrganization,
  findServiceRequestInOrganization,
  findTechnicianInOrganization,
  listActiveAssignmentsForJob,
  listActivitiesForJob,
  listAssignmentsForJob,
  listJobIdsForTechnicianInOrganization,
  listJobsForOrganization,
  listNotesForJob,
  listPhotosForJob,
  listTechnicianVisibleJobIds,
  updateAssignmentStatusInOrganization,
  updateJobInOrganization,
} from '../db/queries/index.js';
import { db } from '../db/index.js';
import type { JobActivity } from '../db/schema/job-activity.js';
import type { JobAssignment } from '../db/schema/job-assignment.js';
import type { JobNote } from '../db/schema/job-note.js';
import type { JobPhoto, JobPhotoKind } from '../db/schema/job-photo.js';
import type { Job, JobPriority } from '../db/schema/job.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import { CustomerNotificationsService } from '../notifications/customer-notifications.service.js';
import { AutomationIngressService } from '../automation/automation-ingress.service.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import { AuditService } from '../audit/audit.service.js';
import {
  FILE_STORAGE,
  type FileStorage,
} from '../storage/file-storage.js';
import { canTransitionAssignmentStatus } from './assignment-status.js';
import type {
  AssignTechniciansDto,
  ReassignTechnicianDto,
} from './dto/assign-technicians.dto.js';
import type { CompleteJobDto } from './dto/complete-job.dto.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { CreateJobNoteDto } from './dto/create-job-note.dto.js';
import type { ListJobsQueryDto } from './dto/list-jobs-query.dto.js';
import type { ScheduleJobDto } from './dto/schedule-job.dto.js';
import type { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import type { UpdateJobDto } from './dto/update-job.dto.js';
import type { UpdateProgressDto } from './dto/update-progress.dto.js';
import { canTransitionJobStatus } from './job-status.js';

const ALLOWED_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

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
    completionSummary: row.completionSummary,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNoteDto(row: JobNote) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    body: row.body,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function toPhotoDto(row: JobPhoto) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    kind: row.kind,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

function toActivityDto(row: JobActivity) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    action: row.action,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    message: row.message,
    actorUserId: row.actorUserId,
    createdAt: row.createdAt,
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
  if (status !== 'DRAFT' && status !== 'CONFIRMED') {
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

  constructor(
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
    private readonly customerNotifications: CustomerNotificationsService,
    private readonly automationIngress: AutomationIngressService,
    private readonly audit: AuditService,
  ) {}

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

      await this.audit.record({
        organizationId,
        actorUserId,
        action: AuditAction.JOB_CREATED,
        entityType: AuditEntityType.JOB,
        entityId: created.id,
        metadata: {
          after: {
            customerId: created.customerId,
            requestId: created.requestId,
            status: created.status,
            priority: created.priority,
          },
        },
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
      if (dto.status !== undefined) {
        throw new ForbiddenException({
          statusCode: 403,
          message:
            'Technicians must use progress and complete endpoints for status changes',
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

    if (dto.status === 'COMPLETED') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Use the complete endpoint to finish a job',
        error: 'Bad Request',
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

    if (nextStatus === 'IN_PROGRESS' && existing.actualStart == null) {
      if (actualStart === undefined) actualStart = now;
    }

    const updated = await db.transaction(async (tx) => {
      const row = await updateJobInOrganization(
        {
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
        },
        tx,
      );
      if (!row) return null;

      if (dto.status !== undefined && dto.status !== existing.status) {
        await createJobActivity(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            action: 'STATUS_CHANGED',
            actorUserId: actorUserId,
            fromStatus: existing.status,
            toStatus: dto.status,
          },
          tx,
        );
      }
      return row;
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.audit.record({
        organizationId,
        actorUserId,
        action: AuditAction.JOB_STATUS_CHANGED,
        entityType: AuditEntityType.JOB,
        entityId: updated.id,
        metadata: {
          before: { status: existing.status },
          after: { status: updated.status },
        },
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
      await createJobActivity(
        {
          id: randomUUID(),
          organizationId,
          jobId,
          action: 'STATUS_CHANGED',
          actorUserId,
          fromStatus: existing.status,
          toStatus: 'CANCELLED',
        },
        tx,
      );
      return cancelled;
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.JOB_CANCELLED,
      entityType: AuditEntityType.JOB,
      entityId: updated.id,
      metadata: {
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });

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

    await this.customerNotifications.notifyFromEvent({
      organizationId,
      customerId: updated.customerId,
      eventType: 'JOB_SCHEDULED',
      idempotencyKey: `JOB_SCHEDULED:${updated.id}`,
      payload: {
        jobId: updated.id,
        scheduledStart: updated.scheduledStart?.toISOString() ?? null,
        scheduledEnd: updated.scheduledEnd?.toISOString() ?? null,
      },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.JOB_SCHEDULED,
      entityType: AuditEntityType.JOB,
      entityId: updated.id,
      metadata: {
        scheduledStart: updated.scheduledStart?.toISOString() ?? null,
        scheduledEnd: updated.scheduledEnd?.toISOString() ?? null,
        status: updated.status,
      },
    });

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

    await this.customerNotifications.notifyFromEvent({
      organizationId,
      customerId: updated.customerId,
      eventType: 'JOB_RESCHEDULED',
      idempotencyKey: `JOB_RESCHEDULED:${updated.id}:${scheduledStart.toISOString()}`,
      payload: {
        jobId: updated.id,
        scheduledStart: updated.scheduledStart?.toISOString() ?? null,
        scheduledEnd: updated.scheduledEnd?.toISOString() ?? null,
      },
    });

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

    for (const assignment of assignments) {
      await this.customerNotifications.notifyFromEvent({
        organizationId,
        customerId: jobRow.customerId,
        eventType: 'TECHNICIAN_ASSIGNED',
        idempotencyKey: `TECHNICIAN_ASSIGNED:${assignment.id}`,
        payload: {
          jobId: jobRow.id,
          assignmentId: assignment.id,
          technicianId: assignment.technicianId,
        },
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.JOB_ASSIGNED,
      entityType: AuditEntityType.JOB,
      entityId: jobId,
      metadata: {
        technicianIds: assignments.map((a) => a.technicianId),
      },
    });

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

  async updateProgress(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: UpdateProgressDto,
  ) {
    const { job: existing } = await this.requireJobExecutorAccess(
      organizationId,
      actorUserId,
      jobId,
    );

    if (!canTransitionJobStatus(existing.status, dto.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot change status from ${existing.status} to ${dto.status}`,
        error: 'Conflict',
      });
    }

    const now = new Date();
    let actualStart: Date | undefined;
    if (dto.status === 'IN_PROGRESS' && existing.actualStart == null) {
      actualStart = now;
    }

    const updated = await db.transaction(async (tx) => {
      const row = await updateJobInOrganization(
        {
          organizationId,
          jobId,
          status: dto.status,
          actualStart,
        },
        tx,
      );
      if (!row) return null;

      if (dto.status !== existing.status) {
        await createJobActivity(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            action: 'STATUS_CHANGED',
            actorUserId,
            fromStatus: existing.status,
            toStatus: dto.status,
            message: dto.note ?? null,
          },
          tx,
        );
      }

      if (dto.note) {
        await createJobNote(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            body: dto.note,
            createdBy: actorUserId,
          },
          tx,
        );
        await createJobActivity(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            action: 'NOTE_ADDED',
            actorUserId,
            message: dto.note,
          },
          tx,
        );
      }

      return row;
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

  async completeJob(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: CompleteJobDto,
  ) {
    const { job: existing } = await this.requireJobExecutorAccess(
      organizationId,
      actorUserId,
      jobId,
    );

    if (!canTransitionJobStatus(existing.status, 'COMPLETED')) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot complete a job in status ${existing.status}`,
        error: 'Conflict',
      });
    }

    const summary = dto.completionSummary.trim();
    if (summary.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Completion summary is required',
        error: 'Bad Request',
      });
    }

    const now = new Date();
    const updated = await db.transaction(async (tx) => {
      const row = await updateJobInOrganization(
        {
          organizationId,
          jobId,
          status: 'COMPLETED',
          completionSummary: summary,
          actualEnd: existing.actualEnd ?? now,
          completedAt: existing.completedAt ?? now,
          actualStart: existing.actualStart ?? now,
        },
        tx,
      );
      if (!row) return null;

      await createJobActivity(
        {
          id: randomUUID(),
          organizationId,
          jobId,
          action: 'COMPLETED',
          actorUserId,
          fromStatus: existing.status,
          toStatus: 'COMPLETED',
          message: summary,
        },
        tx,
      );

      if (dto.note) {
        await createJobNote(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            body: dto.note,
            createdBy: actorUserId,
          },
          tx,
        );
        await createJobActivity(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            action: 'NOTE_ADDED',
            actorUserId,
            message: dto.note,
          },
          tx,
        );
      }

      return row;
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    await this.customerNotifications.notifyFromEvent({
      organizationId,
      customerId: updated.customerId,
      eventType: 'JOB_COMPLETED',
      idempotencyKey: `JOB_COMPLETED:${updated.id}`,
      payload: {
        jobId: updated.id,
        completedAt: updated.completedAt?.toISOString() ?? null,
      },
      actorUserId,
      jobId: updated.id,
    });

    await this.automationIngress.accept({
      organizationId,
      triggerEvent: 'JOB_COMPLETED',
      eventId: updated.id,
      context: {
        customerId: updated.customerId,
        jobId: updated.id,
      },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.JOB_COMPLETED,
      entityType: AuditEntityType.JOB,
      entityId: updated.id,
      metadata: {
        before: { status: existing.status },
        after: { status: updated.status },
        completedAt: updated.completedAt?.toISOString() ?? null,
      },
    });

    return { job: toJobDto(updated) };
  }

  async addNote(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    dto: CreateJobNoteDto,
  ) {
    await this.requireJobExecutorAccess(organizationId, actorUserId, jobId);

    const note = await db.transaction(async (tx) => {
      const created = await createJobNote(
        {
          id: randomUUID(),
          organizationId,
          jobId,
          body: dto.body,
          createdBy: actorUserId,
        },
        tx,
      );
      await createJobActivity(
        {
          id: randomUUID(),
          organizationId,
          jobId,
          action: 'NOTE_ADDED',
          actorUserId,
          message: dto.body,
        },
        tx,
      );
      return created;
    });

    return { note: toNoteDto(note) };
  }

  async listNotes(
    actorUserId: string,
    organizationId: string,
    jobId: string,
  ) {
    await this.requireJobViewerAccess(organizationId, actorUserId, jobId);
    const notes = await listNotesForJob(organizationId, jobId);
    return { notes: notes.map(toNoteDto) };
  }

  async uploadPhoto(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    kind: JobPhotoKind,
    file: Express.Multer.File | undefined,
  ) {
    await this.requireJobExecutorAccess(organizationId, actorUserId, jobId);

    if (!file) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Photo file is required',
        error: 'Bad Request',
      });
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Photo must be jpeg, png, webp, or heic',
        error: 'Bad Request',
      });
    }

    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Photo must be at most 10MB',
        error: 'Bad Request',
      });
    }

    const photoId = randomUUID();
    const extension = extensionForMime(file.mimetype);
    const storageKey = `${organizationId}/jobs/${jobId}/${photoId}${extension}`;

    await this.fileStorage.put({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    try {
      const photo = await db.transaction(async (tx) => {
        const created = await createJobPhoto(
          {
            id: photoId,
            organizationId,
            jobId,
            kind,
            storageKey,
            fileName: file.originalname || `${photoId}${extension}`,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedBy: actorUserId,
          },
          tx,
        );
        await createJobActivity(
          {
            id: randomUUID(),
            organizationId,
            jobId,
            action: 'PHOTO_UPLOADED',
            actorUserId,
            message: `${kind}: ${created.fileName}`,
          },
          tx,
        );
        return created;
      });

      return { photo: toPhotoDto(photo) };
    } catch (error) {
      await this.fileStorage.delete(storageKey).catch(() => undefined);
      this.logger.error('Failed to persist job photo metadata', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to upload photo',
        error: 'Internal Server Error',
      });
    }
  }

  async listPhotos(
    actorUserId: string,
    organizationId: string,
    jobId: string,
  ) {
    await this.requireJobViewerAccess(organizationId, actorUserId, jobId);
    const photos = await listPhotosForJob(organizationId, jobId);
    return { photos: photos.map(toPhotoDto) };
  }

  async getPhotoContent(
    actorUserId: string,
    organizationId: string,
    jobId: string,
    photoId: string,
  ): Promise<{ file: StreamableFile; mimeType: string; fileName: string }> {
    await this.requireJobViewerAccess(organizationId, actorUserId, jobId);

    const photo = await findPhotoInOrganization(organizationId, photoId);
    if (!photo || photo.jobId !== jobId) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Photo not found',
        error: 'Not Found',
      });
    }

    const object = await this.fileStorage.get(photo.storageKey);
    if (!object) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Photo file not found',
        error: 'Not Found',
      });
    }

    return {
      file: new StreamableFile(object.body),
      mimeType: photo.mimeType,
      fileName: photo.fileName,
    };
  }

  async listActivities(
    actorUserId: string,
    organizationId: string,
    jobId: string,
  ) {
    await this.requireJobViewerAccess(organizationId, actorUserId, jobId);
    const activities = await listActivitiesForJob(organizationId, jobId);
    return { activities: activities.map(toActivityDto) };
  }

  async getExecution(
    actorUserId: string,
    organizationId: string,
    jobId: string,
  ) {
    const { job } = await this.requireJobViewerAccess(
      organizationId,
      actorUserId,
      jobId,
    );
    const [notes, photos, activities] = await Promise.all([
      listNotesForJob(organizationId, jobId),
      listPhotosForJob(organizationId, jobId),
      listActivitiesForJob(organizationId, jobId),
    ]);

    return {
      job: toJobDto(job),
      notes: notes.map(toNoteDto),
      photos: photos.map(toPhotoDto),
      activities: activities.map(toActivityDto),
    };
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

  /** Managers or assigned technicians may mutate execution state. */
  private async requireJobExecutorAccess(
    organizationId: string,
    userId: string,
    jobId: string,
  ): Promise<{ membership: OrganizationMember; job: Job }> {
    const membership = await this.requireActiveMember(organizationId, userId);
    const job = await findJobInOrganization(organizationId, jobId);
    if (!job) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (isJobManagerRole(membership.role)) {
      return { membership, job };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleJobIds(
        organizationId,
        userId,
      );
      if (!visibleIds.includes(job.id)) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Not allowed to update this job',
          error: 'Forbidden',
        });
      }
      return { membership, job };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to update job execution',
      error: 'Forbidden',
    });
  }

  /** Managers or assigned technicians may view execution details. */
  private async requireJobViewerAccess(
    organizationId: string,
    userId: string,
    jobId: string,
  ): Promise<{ membership: OrganizationMember; job: Job }> {
    const membership = await this.requireActiveMember(organizationId, userId);
    const job = await findJobInOrganization(organizationId, jobId);
    if (!job) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (isJobManagerRole(membership.role)) {
      return { membership, job };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleJobIds(
        organizationId,
        userId,
      );
      if (!visibleIds.includes(job.id)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Job not found',
          error: 'Not Found',
        });
      }
      return { membership, job };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view job execution',
      error: 'Forbidden',
    });
  }
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
    case 'image/heif':
      return '.heic';
    default:
      return '';
  }
}

