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
  cancelJobInOrganization,
  createJob,
  findActiveMembership,
  findCustomerInOrganization,
  findJobByRequestId,
  findJobInOrganization,
  findServiceRequestInOrganization,
  listJobsForOrganization,
  listTechnicianVisibleJobIds,
  updateJobInOrganization,
} from '../db/queries/index.js';
import type { Job, JobPriority } from '../db/schema/job.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { ListJobsQueryDto } from './dto/list-jobs-query.dto.js';
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
    estimatedDuration: row.estimatedDuration,
    actualStart: row.actualStart,
    actualEnd: row.actualEnd,
    completedAt: row.completedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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

function mapServiceRequestPriority(
  priority: string,
): JobPriority {
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
      const rows = await listJobsForOrganization(baseFilter);
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

    const updated = await cancelJobInOrganization(organizationId, jobId);
    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    return { job: toJobDto(updated) };
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
