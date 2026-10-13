import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createCustomer,
  findActiveMembership,
  findCustomerInOrganization,
  listCustomersByIdsInOrganization,
  listCustomersForOrganization,
  listTechnicianVisibleCustomerIds,
  softDeleteCustomerInOrganization,
  updateCustomerInOrganization,
} from '../db/queries/index.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { Customer } from '../db/schema/customer.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import type { UpdateCustomerDto } from './dto/update-customer.dto.js';

const CUSTOMER_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

type CustomerManagerRole = (typeof CUSTOMER_MANAGER_ROLES)[number];

function isCustomerManagerRole(
  role: OrganizationMemberRole,
): role is CustomerManagerRole {
  return (CUSTOMER_MANAGER_ROLES as readonly string[]).includes(role);
}

function toCustomerDto(row: Customer) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly audit: AuditService) {}

  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateCustomerDto,
  ) {
    await this.requireCustomerManager(organizationId, actorUserId);

    try {
      const created = await createCustomer({
        id: randomUUID(),
        organizationId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        address: dto.address ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        postalCode: dto.postalCode ?? null,
        notes: dto.notes ?? null,
      });

      await this.audit.record({
        organizationId,
        actorUserId: actorUserId,
        action: AuditAction.CUSTOMER_CREATED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: created.id,
        metadata: {
          after: {
            status: created.status,
            city: created.city,
            state: created.state,
          },
        },
      });

      return { customer: toCustomerDto(created) };
    } catch (error) {
      this.logger.error('Failed to create customer', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create customer',
        error: 'Internal Server Error',
      });
    }
  }

  async list(actorUserId: string, organizationId: string) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    if (isCustomerManagerRole(membership.role)) {
      const customers = await listCustomersForOrganization(organizationId);
      return { customers: customers.map(toCustomerDto) };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleCustomerIds(
        organizationId,
        actorUserId,
      );
      const customers = await listCustomersByIdsInOrganization(
        organizationId,
        visibleIds,
      );
      return { customers: customers.map(toCustomerDto) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view customers',
      error: 'Forbidden',
    });
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    customerId: string,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    const row = await findCustomerInOrganization(organizationId, customerId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    if (isCustomerManagerRole(membership.role)) {
      return { customer: toCustomerDto(row) };
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleIds = await listTechnicianVisibleCustomerIds(
        organizationId,
        actorUserId,
      );
      if (!visibleIds.includes(row.id)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Customer not found',
          error: 'Not Found',
        });
      }
      return { customer: toCustomerDto(row) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view customers',
      error: 'Forbidden',
    });
  }

  async update(
    actorUserId: string,
    organizationId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ) {
    if (
      dto.name === undefined &&
      dto.phone === undefined &&
      dto.email === undefined &&
      dto.address === undefined &&
      dto.city === undefined &&
      dto.state === undefined &&
      dto.postalCode === undefined &&
      dto.notes === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one field is required',
        error: 'Bad Request',
      });
    }

    await this.requireCustomerManager(organizationId, actorUserId);

    const existing = await findCustomerInOrganization(
      organizationId,
      customerId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    const updated = await updateCustomerInOrganization({
      organizationId,
      customerId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      notes: dto.notes,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId: actorUserId,
      action: AuditAction.CUSTOMER_UPDATED,
      entityType: AuditEntityType.CUSTOMER,
      entityId: updated.id,
      metadata: {
        before: {
          status: existing.status,
          city: existing.city,
          state: existing.state,
        },
        after: {
          status: updated.status,
          city: updated.city,
          state: updated.state,
        },
        fields: Object.keys(dto).filter(
          (key) => (dto as Record<string, unknown>)[key] !== undefined,
        ),
      },
    });

    return { customer: toCustomerDto(updated) };
  }

  async softDelete(
    actorUserId: string,
    organizationId: string,
    customerId: string,
  ) {
    await this.requireCustomerManager(organizationId, actorUserId);

    const existing = await findCustomerInOrganization(
      organizationId,
      customerId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    const updated = await softDeleteCustomerInOrganization(
      organizationId,
      customerId,
    );
    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId: actorUserId,
      action: AuditAction.CUSTOMER_DEACTIVATED,
      entityType: AuditEntityType.CUSTOMER,
      entityId: updated.id,
      metadata: {
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });

    return { customer: toCustomerDto(updated) };
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

  private async requireCustomerManager(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isCustomerManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Only owners, admins, and dispatchers can manage customers',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
