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
  acceptInvitation,
  createInvitation,
  deleteMemberInOrganization,
  findActiveMembership,
  findInvitationByToken,
  findMemberInOrganization,
  findMembershipByOrgUser,
  findPendingInvitationByOrgEmail,
  isManagerRole,
  listMembersForOrganization,
  markInvitationExpired,
  updateMemberInOrganization,
  type InvitableRole,
} from '../db/queries/members.js';
import {
  createOrganizationWithOwner,
  listOrganizationsForUser,
} from '../db/queries/organizations.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';
import type { CreateOrganizationDto } from './dto/create-organization.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function uniqueConstraintName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  if ('constraint_name' in error) {
    return String((error as { constraint_name?: unknown }).constraint_name ?? '');
  }
  if ('constraint' in error) {
    return String((error as { constraint?: unknown }).constraint ?? '');
  }
  return '';
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly audit: AuditService) {}

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

      await this.audit.recordCritical({
        organizationId: result.organization.id,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_CREATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: result.organization.id,
        metadata: {
          after: {
            slug: result.organization.slug,
            timezone: result.organization.timezone,
            currency: result.organization.currency,
          },
        },
      });

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
        const constraint = uniqueConstraintName(error);
        if (constraint.includes('organization_member_org_user')) {
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

  async createInvitation(
    actorUserId: string,
    organizationId: string,
    dto: CreateInvitationDto,
  ) {
    await this.requireManager(organizationId, actorUserId);

    const existingMemberEmail = await this.findMemberEmailCollision(
      organizationId,
      dto.email,
    );
    if (existingMemberEmail) {
      throw new ConflictException({
        statusCode: 409,
        message: 'User is already a member of this organization',
        error: 'Conflict',
      });
    }

    const pending = await findPendingInvitationByOrgEmail(
      organizationId,
      dto.email,
    );
    if (pending) {
      if (pending.expiresAt <= new Date()) {
        await markInvitationExpired(pending.id);
      } else {
        throw new ConflictException({
          statusCode: 409,
          message: 'A pending invitation already exists for this email',
          error: 'Conflict',
        });
      }
    }

    try {
      const invitation = await createInvitation({
        id: randomUUID(),
        organizationId,
        email: dto.email,
        role: dto.role,
        token: randomBytes(32).toString('hex'),
        invitedByUserId: actorUserId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      });

      await this.audit.recordCritical({
        organizationId,
        actorUserId: actorUserId,
        action: AuditAction.INVITATION_CREATED,
        entityType: AuditEntityType.INVITATION,
        entityId: invitation.id,
        metadata: {
          after: {
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt.toISOString(),
          },
        },
      });

      return {
        invitation: {
          id: invitation.id,
          organizationId: invitation.organizationId,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'A pending invitation already exists for this email',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to create invitation');
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create invitation',
        error: 'Internal Server Error',
      });
    }
  }

  async listMembers(actorUserId: string, organizationId: string) {
    await this.requireActiveMember(organizationId, actorUserId);
    const members = await listMembersForOrganization(organizationId);
    return { members };
  }

  async updateMember(
    actorUserId: string,
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    if (dto.role === undefined && dto.status === undefined) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one of role or status is required',
        error: 'Bad Request',
      });
    }

    await this.requireManager(organizationId, actorUserId);

    const target = await findMemberInOrganization(organizationId, memberId);
    if (!target) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Member not found',
        error: 'Not Found',
      });
    }

    if (target.role === 'OWNER') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Cannot change the organization owner',
        error: 'Forbidden',
      });
    }

    const updated = await updateMemberInOrganization({
      organizationId,
      memberId,
      role: dto.role,
      status: dto.status,
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Member not found',
        error: 'Not Found',
      });
    }

    await this.audit.recordCritical({
      organizationId,
      actorUserId: actorUserId,
      action: AuditAction.MEMBER_UPDATED,
      entityType: AuditEntityType.MEMBER,
      entityId: updated.id,
      metadata: {
        before: { role: target.role, status: target.status },
        after: { role: updated.role, status: updated.status },
        targetUserId: updated.userId,
      },
    });

    return {
      member: {
        id: updated.id,
        organizationId: updated.organizationId,
        userId: updated.userId,
        role: updated.role,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async removeMember(
    actorUserId: string,
    organizationId: string,
    memberId: string,
  ) {
    await this.requireManager(organizationId, actorUserId);

    const target = await findMemberInOrganization(organizationId, memberId);
    if (!target) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Member not found',
        error: 'Not Found',
      });
    }

    if (target.role === 'OWNER') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Cannot remove the organization owner',
        error: 'Forbidden',
      });
    }

    if (target.userId === actorUserId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Cannot remove yourself from the organization',
        error: 'Bad Request',
      });
    }

    const removed = await deleteMemberInOrganization(organizationId, memberId);
    if (!removed) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Member not found',
        error: 'Not Found',
      });
    }

    await this.audit.recordCritical({
      organizationId,
      actorUserId: actorUserId,
      action: AuditAction.MEMBER_REMOVED,
      entityType: AuditEntityType.MEMBER,
      entityId: memberId,
      metadata: {
        before: {
          role: target.role,
          status: target.status,
          targetUserId: target.userId,
        },
      },
    });

    return { success: true };
  }

  async acceptInvitation(
    actorUserId: string,
    actorEmail: string,
    token: string,
  ) {
    const invitation = await findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invitation not found',
        error: 'Not Found',
      });
    }

    if (invitation.status !== 'PENDING') {
      throw new ConflictException({
        statusCode: 409,
        message: 'Invitation is no longer pending',
        error: 'Conflict',
      });
    }

    if (invitation.expiresAt <= new Date()) {
      await markInvitationExpired(invitation.id);
      throw new ConflictException({
        statusCode: 409,
        message: 'Invitation has expired',
        error: 'Conflict',
      });
    }

    if (invitation.email.toLowerCase() !== actorEmail.trim().toLowerCase()) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invitation email does not match the authenticated user',
        error: 'Forbidden',
      });
    }

    if (invitation.role === 'OWNER' || !this.isSafeInviteRole(invitation.role)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invitation role is invalid',
        error: 'Bad Request',
      });
    }

    const existing = await findMembershipByOrgUser(
      invitation.organizationId,
      actorUserId,
    );
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'You are already a member of this organization',
        error: 'Conflict',
      });
    }

    try {
      const result = await acceptInvitation({
        invitationId: invitation.id,
        organizationId: invitation.organizationId,
        userId: actorUserId,
        role: invitation.role as InvitableRole,
        membershipId: randomUUID(),
      });

      await this.audit.recordCritical({
        organizationId: invitation.organizationId,
        actorUserId: actorUserId,
        action: AuditAction.INVITATION_ACCEPTED,
        entityType: AuditEntityType.INVITATION,
        entityId: invitation.id,
        metadata: {
          after: {
            membershipId: result.membership.id,
            role: result.membership.role,
            status: result.membership.status,
          },
        },
      });

      return {
        membership: {
          id: result.membership.id,
          organizationId: result.membership.organizationId,
          userId: result.membership.userId,
          role: result.membership.role,
          status: result.membership.status,
        },
        invitation: {
          id: result.invitation.id,
          status: result.invitation.status,
          acceptedAt: result.invitation.acceptedAt,
        },
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'You are already a member of this organization',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to accept invitation');
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to accept invitation',
        error: 'Internal Server Error',
      });
    }
  }

  private isSafeInviteRole(role: string): role is InvitableRole {
    return role === 'ADMIN' || role === 'DISPATCHER' || role === 'TECHNICIAN';
  }

  private async requireActiveMember(organizationId: string, userId: string) {
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

  private async requireManager(organizationId: string, userId: string) {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only owners and admins can manage the team',
        error: 'Forbidden',
      });
    }
    return membership;
  }

  private async findMemberEmailCollision(
    organizationId: string,
    email: string,
  ): Promise<boolean> {
    const members = await listMembersForOrganization(organizationId);
    return members.some(
      (member) => member.userEmail.toLowerCase() === email.toLowerCase(),
    );
  }
}
