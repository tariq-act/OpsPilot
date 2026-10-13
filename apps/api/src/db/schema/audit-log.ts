import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { organization } from './organization.js';

/**
 * Append-only organization audit trail.
 * Application code must not update or delete rows.
 * actorUserId is null for system-generated actions (e.g. automation failures).
 * metadata must not contain passwords, tokens, payment credentials, or contact PII.
 */

export const auditLog = pgTable.withRLS(
  'audit_log',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_log_organizationId_idx').on(table.organizationId),
    index('audit_log_createdAt_idx').on(table.createdAt),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_entityType_idx').on(table.entityType),
    index('audit_log_entityId_idx').on(table.entityId),
    index('audit_log_org_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('audit_log_org_entity_idx').on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
    index('audit_log_actorUserId_idx').on(table.actorUserId),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
