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
  findActiveMembership,
  findAuditLogInOrganization,
  insertAuditLog,
  isManagerRole,
  listAuditLogsForOrganization,
} from '../db/queries/index.js';
import type { AuditActionName, AuditEntityTypeName } from './audit.actions.js';
import { getAuditRequestMeta } from './audit.context.js';
import { sanitizeAuditMetadata } from './audit.sanitize.js';
import type { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto.js';

export type AuditRecordInput = {
  organizationId: string;
  /** Null for system-generated actions (e.g. automation worker). */
  actorUserId: string | null;
  action: AuditActionName | string;
  entityType: AuditEntityTypeName | string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function toAuditDto(row: {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorUserId: row.actorUserId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /**
   * Append an audit row after a successful business operation.
   * Failures are logged and never thrown (safe for most domain call sites).
   */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.insert(input);
    } catch (error) {
      this.logger.warn(
        `Audit record failed action=${input.action} org=${input.organizationId} entity=${input.entityType}/${input.entityId}`,
      );
      if (error instanceof Error) {
        this.logger.warn(error.message);
      }
    }
  }

  /**
   * For financial and security-sensitive operations.
   * Logs at error level and throws so callers can surface the failure deliberately.
   */
  async recordCritical(input: AuditRecordInput): Promise<void> {
    try {
      await this.insert(input);
    } catch (error) {
      this.logger.error(
        `Critical audit record failed action=${input.action} org=${input.organizationId} entity=${input.entityType}/${input.entityId}`,
      );
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to record audit log for a sensitive operation',
        error: 'Internal Server Error',
      });
    }
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListAuditLogsQueryDto,
  ) {
    await this.requireViewer(organizationId, actorUserId);

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'fromDate must be a valid ISO date string',
        error: 'Bad Request',
      });
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'toDate must be a valid ISO date string',
        error: 'Bad Request',
      });
    }
    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'fromDate must be before or equal to toDate',
        error: 'Bad Request',
      });
    }

    const rows = await listAuditLogsForOrganization({
      organizationId,
      actorUserId: query.actorUserId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      fromDate,
      toDate,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    return { auditLogs: rows.map(toAuditDto) };
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    auditLogId: string,
  ) {
    await this.requireViewer(organizationId, actorUserId);

    const row = await findAuditLogInOrganization(organizationId, auditLogId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Audit log not found',
        error: 'Not Found',
      });
    }

    return { auditLog: toAuditDto(row) };
  }

  private async insert(input: AuditRecordInput) {
    const requestMeta = getAuditRequestMeta();
    return insertAuditLog({
      id: randomUUID(),
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: sanitizeAuditMetadata(input.metadata),
      ipAddress: input.ipAddress ?? requestMeta.ipAddress,
      userAgent: input.userAgent ?? requestMeta.userAgent,
    });
  }

  private async requireViewer(organizationId: string, userId: string) {
    const membership = await findActiveMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not a member of this organization',
        error: 'Forbidden',
      });
    }
    if (!isManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only owners and admins can view audit logs',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
