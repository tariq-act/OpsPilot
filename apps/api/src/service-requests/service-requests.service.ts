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
  cancelServiceRequestInOrganization,
  createServiceRequest,
  findActiveMembership,
  findCustomerInOrganization,
  findServiceRequestInOrganization,
  listServiceRequestsForOrganization,
  listTechnicianVisibleServiceRequestIds,
  updateServiceRequestInOrganization,
} from '../db/queries/index.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { ServiceRequest } from '../db/schema/service-request.js';
import type { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import type { ListServiceRequestsQueryDto } from './dto/list-service-requests-query.dto.js';
import type { UpdateServiceRequestDto } from './dto/update-service-request.dto.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import { AuditService } from '../audit/audit.service.js';
import { canTransitionServiceRequestStatus } from './service-request-status.js';

const REQUEST_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

type RequestManagerRole = (typeof REQUEST_MANAGER_ROLES)[number];

function isRequestManagerRole(
  role: OrganizationMemberRole,
): role is RequestManagerRole {
  return (REQUEST_MANAGER_ROLES as readonly string[]).includes(role);
}

function toServiceRequestDto(row: ServiceRequest) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    source: row.source,
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
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

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(private readonly audit: AuditService) {}

  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateServiceRequestDto,
  ) {
    await this.requireRequestManager(organizationId, actorUserId);

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

    try {
      const created = await createServiceRequest({
        id: randomUUID(),
        organizationId,
        customerId: dto.customerId,
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'MEDIUM',
        source: dto.source ?? 'OTHER',
        preferredDate: parseOptionalDate(dto.preferredDate) ?? null,
        preferredTime: dto.preferredTime ?? null,
        createdBy: actorUserId,
      });

      await this.audit.record({
        organizationId,
        actorUserId,
        action: AuditAction.SERVICE_REQUEST_CREATED,
        entityType: AuditEntityType.SERVICE_REQUEST,
        entityId: created.id,
        metadata: {
          after: {
            customerId: created.customerId,
            status: created.status,
            priority: created.priority,
          },
        },
      });

      return { serviceRequest: toServiceRequestDto(created) };
    } catch (error) {
      this.logger.error('Failed to create service request', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create service request',
        error: 'Internal Server Error',
      });
    }
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListServiceRequestsQueryDto,
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
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    };

    if (isRequestManagerRole(membership.role)) {
      const rows = await listServiceRequestsForOrganization(baseFilter);
      return { serviceRequests: rows.map(toServiceRequestDto) };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleServiceRequestIds(
        organizationId,
        actorUserId,
      );
      const rows = await listServiceRequestsForOrganization({
        ...baseFilter,
        ids: visibleIds,
      });
      return { serviceRequests: rows.map(toServiceRequestDto) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view service requests',
      error: 'Forbidden',
    });
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    serviceRequestId: string,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    const row = await findServiceRequestInOrganization(
      organizationId,
      serviceRequestId,
    );
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Service request not found',
        error: 'Not Found',
      });
    }

    if (isRequestManagerRole(membership.role)) {
      return { serviceRequest: toServiceRequestDto(row) };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleServiceRequestIds(
        organizationId,
        actorUserId,
      );
      if (!visibleIds.includes(row.id)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Service request not found',
          error: 'Not Found',
        });
      }
      return { serviceRequest: toServiceRequestDto(row) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view service requests',
      error: 'Forbidden',
    });
  }

  async update(
    actorUserId: string,
    organizationId: string,
    serviceRequestId: string,
    dto: UpdateServiceRequestDto,
  ) {
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.priority === undefined &&
      dto.status === undefined &&
      dto.source === undefined &&
      dto.preferredDate === undefined &&
      dto.preferredTime === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one field is required',
        error: 'Bad Request',
      });
    }

    await this.requireRequestManager(organizationId, actorUserId);

    const existing = await findServiceRequestInOrganization(
      organizationId,
      serviceRequestId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Service request not found',
        error: 'Not Found',
      });
    }

    if (
      dto.status !== undefined &&
      !canTransitionServiceRequestStatus(existing.status, dto.status)
    ) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot change status from ${existing.status} to ${dto.status}`,
        error: 'Conflict',
      });
    }

    const updated = await updateServiceRequestInOrganization({
      organizationId,
      serviceRequestId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      status: dto.status,
      source: dto.source,
      preferredDate: parseOptionalDate(dto.preferredDate),
      preferredTime: dto.preferredTime,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Service request not found',
        error: 'Not Found',
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.SERVICE_REQUEST_UPDATED,
      entityType: AuditEntityType.SERVICE_REQUEST,
      entityId: updated.id,
      metadata: {
        before: {
          status: existing.status,
          priority: existing.priority,
        },
        after: {
          status: updated.status,
          priority: updated.priority,
        },
      },
    });

    return { serviceRequest: toServiceRequestDto(updated) };
  }

  async softCancel(
    actorUserId: string,
    organizationId: string,
    serviceRequestId: string,
  ) {
    await this.requireRequestManager(organizationId, actorUserId);

    const existing = await findServiceRequestInOrganization(
      organizationId,
      serviceRequestId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Service request not found',
        error: 'Not Found',
      });
    }

    if (
      !canTransitionServiceRequestStatus(existing.status, 'CANCELLED')
    ) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot cancel a service request in status ${existing.status}`,
        error: 'Conflict',
      });
    }

    if (existing.status === 'CANCELLED') {
      return { serviceRequest: toServiceRequestDto(existing) };
    }

    const updated = await cancelServiceRequestInOrganization(
      organizationId,
      serviceRequestId,
    );
    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Service request not found',
        error: 'Not Found',
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.SERVICE_REQUEST_CANCELLED,
      entityType: AuditEntityType.SERVICE_REQUEST,
      entityId: updated.id,
      metadata: {
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });

    return { serviceRequest: toServiceRequestDto(updated) };
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

  private async requireRequestManager(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isRequestManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Only owners, admins, and dispatchers can manage service requests',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
