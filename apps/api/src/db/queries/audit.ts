import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import { auditLog, type AuditLog } from '../schema/audit-log.js';

export type CreateAuditLogInput = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type ListAuditLogsFilter = {
  organizationId: string;
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit: number;
  offset: number;
};

export async function insertAuditLog(
  input: CreateAuditLogInput,
): Promise<AuditLog> {
  const [row] = await db
    .insert(auditLog)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to insert audit log');
  }
  return row;
}

export async function findAuditLogInOrganization(
  organizationId: string,
  auditLogId: string,
): Promise<AuditLog | null> {
  const [row] = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.id, auditLogId),
        eq(auditLog.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listAuditLogsForOrganization(
  filter: ListAuditLogsFilter,
): Promise<AuditLog[]> {
  const conditions: SQL[] = [
    eq(auditLog.organizationId, filter.organizationId),
  ];

  if (filter.actorUserId) {
    conditions.push(eq(auditLog.actorUserId, filter.actorUserId));
  }
  if (filter.action) {
    conditions.push(eq(auditLog.action, filter.action));
  }
  if (filter.entityType) {
    conditions.push(eq(auditLog.entityType, filter.entityType));
  }
  if (filter.entityId) {
    conditions.push(eq(auditLog.entityId, filter.entityId));
  }
  if (filter.fromDate) {
    conditions.push(gte(auditLog.createdAt, filter.fromDate));
  }
  if (filter.toDate) {
    conditions.push(lte(auditLog.createdAt, filter.toDate));
  }

  return db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(filter.limit)
    .offset(filter.offset);
}
