import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createCustomerFollowUp,
  findActiveMembership,
  findCustomerInOrganization,
  findFollowUpInOrganization,
  findJobInOrganization,
  listFollowUpsForOrganization,
  updateFollowUpInOrganization,
} from '../db/queries/index.js';
import type { CustomerFollowUp } from '../db/schema/customer-follow-up.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { CreateFollowUpDto } from './dto/create-follow-up.dto.js';
import type { ListFollowUpsQueryDto } from './dto/list-follow-ups-query.dto.js';
import type { UpdateFollowUpDto } from './dto/update-follow-up.dto.js';

const FOLLOW_UP_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

function toFollowUpDto(row: CustomerFollowUp) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    jobId: row.jobId,
    type: row.type,
    status: row.status,
    dueAt: row.dueAt,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class FollowUpsService {
  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateFollowUpDto,
  ) {
    await this.requireManager(organizationId, actorUserId);

    const customer = await findCustomerInOrganization(
      organizationId,
      dto.customerId,
    );
    if (!customer) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    if (dto.jobId) {
      const job = await findJobInOrganization(organizationId, dto.jobId);
      if (!job) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Job not found',
          error: 'Not Found',
        });
      }
      if (job.customerId !== dto.customerId) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Customer does not match the job',
          error: 'Bad Request',
        });
      }
    }

    const dueAt = new Date(dto.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'dueAt must be a valid ISO date string',
        error: 'Bad Request',
      });
    }

    const created = await createCustomerFollowUp({
      id: randomUUID(),
      organizationId,
      customerId: dto.customerId,
      jobId: dto.jobId ?? null,
      type: dto.type,
      status: 'PENDING',
      dueAt,
      notes: dto.notes ?? null,
      createdBy: actorUserId,
    });

    return { followUp: toFollowUpDto(created) };
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListFollowUpsQueryDto,
  ) {
    await this.requireManager(organizationId, actorUserId);

    const rows = await listFollowUpsForOrganization({
      organizationId,
      status: query.status,
      type: query.type,
      customerId: query.customerId,
      jobId: query.jobId,
    });

    return { followUps: rows.map(toFollowUpDto) };
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    followUpId: string,
  ) {
    await this.requireManager(organizationId, actorUserId);

    const row = await findFollowUpInOrganization(organizationId, followUpId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Follow-up not found',
        error: 'Not Found',
      });
    }

    return { followUp: toFollowUpDto(row) };
  }

  async update(
    actorUserId: string,
    organizationId: string,
    followUpId: string,
    dto: UpdateFollowUpDto,
  ) {
    await this.requireManager(organizationId, actorUserId);

    if (
      dto.status === undefined &&
      dto.dueAt === undefined &&
      dto.notes === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one field is required',
        error: 'Bad Request',
      });
    }

    const existing = await findFollowUpInOrganization(
      organizationId,
      followUpId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Follow-up not found',
        error: 'Not Found',
      });
    }

    let dueAt: Date | undefined;
    if (dto.dueAt !== undefined) {
      dueAt = new Date(dto.dueAt);
      if (Number.isNaN(dueAt.getTime())) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'dueAt must be a valid ISO date string',
          error: 'Bad Request',
        });
      }
    }

    const updated = await updateFollowUpInOrganization({
      organizationId,
      followUpId,
      status: dto.status,
      dueAt,
      notes: dto.notes,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Follow-up not found',
        error: 'Not Found',
      });
    }

    return { followUp: toFollowUpDto(updated) };
  }

  private async requireManager(
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
    if (
      !(FOLLOW_UP_MANAGER_ROLES as readonly string[]).includes(membership.role)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Only owners, admins, and dispatchers can manage follow-ups',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
