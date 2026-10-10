import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  createTechnician,
  findActiveMembership,
  findMembershipByOrgUser,
  findTechnicianByEmployeeCodeInOrganization,
  findTechnicianByUserInOrganization,
  findTechnicianInOrganization,
  listTechniciansForOrganization,
  softDeleteTechnicianInOrganization,
  updateTechnicianInOrganization,
} from '../db/queries/index.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { Technician } from '../db/schema/technician.js';
import type { CreateTechnicianDto } from './dto/create-technician.dto.js';
import type { ListTechniciansQueryDto } from './dto/list-technicians-query.dto.js';
import type { UpdateTechnicianDto } from './dto/update-technician.dto.js';

const TECHNICIAN_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
] as const satisfies readonly OrganizationMemberRole[];

const TECHNICIAN_VIEWER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

type TechnicianManagerRole = (typeof TECHNICIAN_MANAGER_ROLES)[number];
type TechnicianViewerRole = (typeof TECHNICIAN_VIEWER_ROLES)[number];

function isTechnicianManagerRole(
  role: OrganizationMemberRole,
): role is TechnicianManagerRole {
  return (TECHNICIAN_MANAGER_ROLES as readonly string[]).includes(role);
}

function isTechnicianViewerRole(
  role: OrganizationMemberRole,
): role is TechnicianViewerRole {
  return (TECHNICIAN_VIEWER_ROLES as readonly string[]).includes(role);
}

function toTechnicianDto(row: Technician) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    employeeCode: row.employeeCode,
    phone: row.phone,
    bio: row.bio,
    status: row.status,
    hireDate: row.hireDate,
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

function uniqueViolationConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) {
    return undefined;
  }
  const constraint = (error as { constraint?: unknown }).constraint;
  return typeof constraint === 'string' ? constraint : undefined;
}

function generateEmployeeCode(): string {
  return `TECH-${randomBytes(3).toString('hex').toUpperCase()}`;
}

@Injectable()
export class TechniciansService {
  private readonly logger = new Logger(TechniciansService.name);

  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateTechnicianDto,
  ) {
    await this.requireTechnicianManager(organizationId, actorUserId);

    const member = await findMembershipByOrgUser(organizationId, dto.userId);
    if (!member || member.status !== 'ACTIVE') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'User is not an active member of this organization',
        error: 'Bad Request',
      });
    }
    if (member.role !== 'TECHNICIAN') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'User must have the TECHNICIAN role in this organization',
        error: 'Bad Request',
      });
    }

    const existingForUser = await findTechnicianByUserInOrganization(
      organizationId,
      dto.userId,
    );
    if (existingForUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'A technician profile already exists for this user',
        error: 'Conflict',
      });
    }

    let employeeCode = dto.employeeCode;
    if (employeeCode) {
      const existingCode = await findTechnicianByEmployeeCodeInOrganization(
        organizationId,
        employeeCode,
      );
      if (existingCode) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Employee code is already in use in this organization',
          error: 'Conflict',
        });
      }
    } else {
      employeeCode = await this.allocateEmployeeCode(organizationId);
    }

    try {
      const created = await createTechnician({
        id: randomUUID(),
        organizationId,
        userId: dto.userId,
        employeeCode,
        phone: dto.phone ?? null,
        bio: dto.bio ?? null,
        hireDate: parseOptionalDate(dto.hireDate) ?? null,
      });

      return { technician: toTechnicianDto(created) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const constraint = uniqueViolationConstraint(error);
        if (constraint?.includes('employee_code')) {
          throw new ConflictException({
            statusCode: 409,
            message: 'Employee code is already in use in this organization',
            error: 'Conflict',
          });
        }
        throw new ConflictException({
          statusCode: 409,
          message: 'A technician profile already exists for this user',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to create technician', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create technician',
        error: 'Internal Server Error',
      });
    }
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListTechniciansQueryDto,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    if (isTechnicianViewerRole(membership.role)) {
      const rows = await listTechniciansForOrganization({
        organizationId,
        status: query.status,
      });
      return { technicians: rows.map(toTechnicianDto) };
    }

    if (membership.role === 'TECHNICIAN') {
      const rows = await listTechniciansForOrganization({
        organizationId,
        status: query.status,
        userId: actorUserId,
      });
      return { technicians: rows.map(toTechnicianDto) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view technicians',
      error: 'Forbidden',
    });
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    technicianId: string,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    const row = await findTechnicianInOrganization(
      organizationId,
      technicianId,
    );
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Technician not found',
        error: 'Not Found',
      });
    }

    if (isTechnicianViewerRole(membership.role)) {
      return { technician: toTechnicianDto(row) };
    }

    if (membership.role === 'TECHNICIAN') {
      if (row.userId !== actorUserId) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Technician not found',
          error: 'Not Found',
        });
      }
      return { technician: toTechnicianDto(row) };
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Not allowed to view technicians',
      error: 'Forbidden',
    });
  }

  async update(
    actorUserId: string,
    organizationId: string,
    technicianId: string,
    dto: UpdateTechnicianDto,
  ) {
    if (
      dto.employeeCode === undefined &&
      dto.phone === undefined &&
      dto.bio === undefined &&
      dto.status === undefined &&
      dto.hireDate === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one field is required',
        error: 'Bad Request',
      });
    }

    await this.requireTechnicianManager(organizationId, actorUserId);

    const existing = await findTechnicianInOrganization(
      organizationId,
      technicianId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Technician not found',
        error: 'Not Found',
      });
    }

    if (
      dto.employeeCode !== undefined &&
      dto.employeeCode !== existing.employeeCode
    ) {
      const codeOwner = await findTechnicianByEmployeeCodeInOrganization(
        organizationId,
        dto.employeeCode,
      );
      if (codeOwner && codeOwner.id !== existing.id) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Employee code is already in use in this organization',
          error: 'Conflict',
        });
      }
    }

    try {
      const updated = await updateTechnicianInOrganization({
        organizationId,
        technicianId,
        employeeCode: dto.employeeCode,
        phone: dto.phone,
        bio: dto.bio,
        status: dto.status,
        hireDate: parseOptionalDate(dto.hireDate),
      });

      if (!updated) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Technician not found',
          error: 'Not Found',
        });
      }

      return { technician: toTechnicianDto(updated) };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Employee code is already in use in this organization',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to update technician', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to update technician',
        error: 'Internal Server Error',
      });
    }
  }

  async softDelete(
    actorUserId: string,
    organizationId: string,
    technicianId: string,
  ) {
    await this.requireTechnicianManager(organizationId, actorUserId);

    const existing = await findTechnicianInOrganization(
      organizationId,
      technicianId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Technician not found',
        error: 'Not Found',
      });
    }

    if (existing.status === 'INACTIVE') {
      return { technician: toTechnicianDto(existing) };
    }

    const updated = await softDeleteTechnicianInOrganization(
      organizationId,
      technicianId,
    );
    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Technician not found',
        error: 'Not Found',
      });
    }

    return { technician: toTechnicianDto(updated) };
  }

  private async allocateEmployeeCode(organizationId: string): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = generateEmployeeCode();
      const existing = await findTechnicianByEmployeeCodeInOrganization(
        organizationId,
        candidate,
      );
      if (!existing) return candidate;
    }
    throw new InternalServerErrorException({
      statusCode: 500,
      message: 'Unable to generate a unique employee code',
      error: 'Internal Server Error',
    });
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

  private async requireTechnicianManager(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isTechnicianManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only owners and admins can manage technicians',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
