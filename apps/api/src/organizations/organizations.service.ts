import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createOrganizationWithOwner,
  listOrganizationsForUser,
} from '../db/queries/organizations.js';
import type { CreateOrganizationDto } from './dto/create-organization.dto.js';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function uniqueViolationTarget(error: unknown): 'slug' | 'membership' | 'unknown' {
  if (typeof error !== 'object' || error === null) {
    return 'unknown';
  }

  const constraint =
    'constraint_name' in error
      ? String((error as { constraint_name?: unknown }).constraint_name ?? '')
      : 'constraint' in error
        ? String((error as { constraint?: unknown }).constraint ?? '')
        : '';

  if (constraint.includes('slug') || constraint.includes('organization_slug')) {
    return 'slug';
  }
  if (constraint.includes('organization_member_org_user')) {
    return 'membership';
  }
  // Postgres unique on organization.slug is often named organization_slug_key
  if (constraint.includes('organization') && constraint.includes('slug')) {
    return 'slug';
  }
  return 'unknown';
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  async create(userId: string, dto: CreateOrganizationDto) {
    try {
      const result = await createOrganizationWithOwner(
        {
          id: randomUUID(),
          name: dto.name,
          slug: dto.slug,
          timezone: dto.timezone,
          currency: dto.currency,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
        },
        {
          id: randomUUID(),
          userId,
        },
      );

      return {
        organization: result.organization,
        membership: {
          id: result.membership.id,
          role: result.membership.role,
          status: result.membership.status,
        },
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const target = uniqueViolationTarget(error);
        if (target === 'membership') {
          throw new ConflictException({
            statusCode: 409,
            message: 'You are already a member of this organization',
            error: 'Conflict',
          });
        }
        throw new ConflictException({
          statusCode: 409,
          message: 'Organization slug already taken',
          error: 'Conflict',
        });
      }

      this.logger.error('Failed to create organization');
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create organization',
        error: 'Internal Server Error',
      });
    }
  }

  async listForUser(userId: string) {
    const organizations = await listOrganizationsForUser(userId);
    return { organizations };
  }
}
