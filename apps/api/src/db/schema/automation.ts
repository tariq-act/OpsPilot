import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { organization } from './organization.js';

/**
 * Organization automation rules and their execution history.
 * Rules are soft-disabled via isActive. Execution rows are never deleted.
 */

export const automationTriggerEnum = pgEnum('automation_trigger', [
  'JOB_COMPLETED',
  'INVOICE_SENT',
  'PAYMENT_RECEIVED',
  'FOLLOW_UP_DUE',
]);

export const automationExecutionStatusEnum = pgEnum(
  'automation_execution_status',
  ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'],
);

export const AUTOMATION_TRIGGERS = automationTriggerEnum.enumValues;
export const AUTOMATION_EXECUTION_STATUSES =
  automationExecutionStatusEnum.enumValues;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];
export type AutomationExecutionStatus =
  (typeof AUTOMATION_EXECUTION_STATUSES)[number];

export type AutomationCondition = {
  field: string;
  operator: 'eq' | 'neq';
  value: string;
};

export type AutomationConditions = {
  match: 'all' | 'any';
  rules: AutomationCondition[];
};

export type AutomationActionItem = {
  type: 'LABOR' | 'PARTS' | 'OTHER' | 'FEE';
  description: string;
  quantity: string;
  unitPrice: string;
};

export type AutomationAction = {
  type:
    | 'CREATE_INVOICE'
    | 'SEND_NOTIFICATION'
    | 'SCHEDULE_FOLLOW_UP'
    | 'SEND_PAYMENT_REMINDER';
  items?: AutomationActionItem[];
  discount?: string;
  tax?: string;
  dueInDays?: number;
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
  followUpType?: 'FEEDBACK' | 'MAINTENANCE_REMINDER';
  notes?: string;
};

/** Operational ids only. No customer contact details. */
export type AutomationExecutionInput = {
  triggerEvent: AutomationTrigger;
  eventId: string;
  customerId: string | null;
  jobId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  followUpId: string | null;
  followUpType: string | null;
  currency: string | null;
  method: string | null;
};

export type AutomationExecutionActionResult = {
  index: number;
  type: string;
  status: 'SUCCEEDED';
  output: Record<string, string>;
};

export type AutomationExecutionResult = {
  outcome?: 'completed' | 'closed';
  actions: AutomationExecutionActionResult[];
};

export const automationRule = pgTable.withRLS(
  'automation_rule',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    triggerEvent: automationTriggerEnum('trigger_event').notNull(),
    conditions: jsonb('conditions').$type<AutomationConditions>().notNull(),
    actions: jsonb('actions').$type<AutomationAction[]>().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('automation_rule_organizationId_idx').on(table.organizationId),
    index('automation_rule_org_trigger_active_idx').on(
      table.organizationId,
      table.triggerEvent,
      table.isActive,
    ),
    index('automation_rule_createdBy_idx').on(table.createdBy),
  ],
);

export const automationExecution = pgTable.withRLS(
  'automation_execution',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    ruleId: text('rule_id')
      .notNull()
      .references(() => automationRule.id, { onDelete: 'cascade' }),
    eventId: text('event_id').notNull(),
    status: automationExecutionStatusEnum('status')
      .default('PENDING')
      .notNull(),
    input: jsonb('input').$type<AutomationExecutionInput>().notNull(),
    result: jsonb('result').$type<AutomationExecutionResult>(),
    error: text('error'),
    /** Same rule + trigger + business event must run at most once. */
    idempotencyKey: text('idempotency_key').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('automation_execution_org_idempotency_uidx').on(
      table.organizationId,
      table.idempotencyKey,
    ),
    index('automation_execution_organizationId_idx').on(table.organizationId),
    index('automation_execution_ruleId_idx').on(table.ruleId),
    index('automation_execution_org_rule_created_idx').on(
      table.organizationId,
      table.ruleId,
      table.createdAt,
    ),
    index('automation_execution_status_idx').on(table.status),
  ],
);

export type AutomationRule = typeof automationRule.$inferSelect;
export type AutomationExecution = typeof automationExecution.$inferSelect;
