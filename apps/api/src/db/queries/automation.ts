import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../index.js';
import {
  automationExecution,
  automationRule,
  type AutomationAction,
  type AutomationConditions,
  type AutomationExecution,
  type AutomationExecutionInput,
  type AutomationExecutionResult,
  type AutomationExecutionStatus,
  type AutomationRule,
  type AutomationTrigger,
} from '../schema/automation.js';
import { customerFollowUp } from '../schema/customer-follow-up.js';

export type CreateAutomationRuleInput = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  triggerEvent: AutomationTrigger;
  conditions: AutomationConditions;
  actions: AutomationAction[];
  isActive: boolean;
  createdBy: string;
};

export type UpdateAutomationRuleInput = {
  organizationId: string;
  ruleId: string;
  name?: string;
  description?: string | null;
  triggerEvent?: AutomationTrigger;
  conditions?: AutomationConditions;
  actions?: AutomationAction[];
  isActive?: boolean;
};

export type ListAutomationRulesFilter = {
  organizationId: string;
  triggerEvent?: AutomationTrigger;
  isActive?: boolean;
  limit: number;
  offset: number;
};

export type CreateAutomationExecutionInput = {
  id: string;
  organizationId: string;
  ruleId: string;
  eventId: string;
  input: AutomationExecutionInput;
  idempotencyKey: string;
};

export type ListAutomationExecutionsFilter = {
  organizationId: string;
  ruleId: string;
  status?: AutomationExecutionStatus;
  limit: number;
  offset: number;
};

export type DueFollowUpForAutomation = {
  id: string;
  organizationId: string;
  customerId: string;
  jobId: string | null;
  type: string;
};

export async function createAutomationRule(
  input: CreateAutomationRuleInput,
): Promise<AutomationRule> {
  const [row] = await db
    .insert(automationRule)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? null,
      triggerEvent: input.triggerEvent,
      conditions: input.conditions,
      actions: input.actions,
      isActive: input.isActive,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create automation rule');
  }
  return row;
}

export async function findAutomationRuleInOrganization(
  organizationId: string,
  ruleId: string,
): Promise<AutomationRule | null> {
  const [row] = await db
    .select()
    .from(automationRule)
    .where(
      and(
        eq(automationRule.id, ruleId),
        eq(automationRule.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findAutomationRuleById(
  ruleId: string,
): Promise<AutomationRule | null> {
  const [row] = await db
    .select()
    .from(automationRule)
    .where(eq(automationRule.id, ruleId))
    .limit(1);

  return row ?? null;
}

export async function listAutomationRulesForOrganization(
  filter: ListAutomationRulesFilter,
): Promise<AutomationRule[]> {
  const conditions = [
    eq(automationRule.organizationId, filter.organizationId),
  ];
  if (filter.triggerEvent) {
    conditions.push(eq(automationRule.triggerEvent, filter.triggerEvent));
  }
  if (filter.isActive !== undefined) {
    conditions.push(eq(automationRule.isActive, filter.isActive));
  }

  return db
    .select()
    .from(automationRule)
    .where(and(...conditions))
    .orderBy(desc(automationRule.createdAt))
    .limit(filter.limit)
    .offset(filter.offset);
}

export async function listActiveAutomationRulesByTrigger(
  organizationId: string,
  triggerEvent: AutomationTrigger,
): Promise<AutomationRule[]> {
  return db
    .select()
    .from(automationRule)
    .where(
      and(
        eq(automationRule.organizationId, organizationId),
        eq(automationRule.triggerEvent, triggerEvent),
        eq(automationRule.isActive, true),
      ),
    );
}

export async function updateAutomationRuleInOrganization(
  input: UpdateAutomationRuleInput,
): Promise<AutomationRule | null> {
  const patch: {
    name?: string;
    description?: string | null;
    triggerEvent?: AutomationTrigger;
    conditions?: AutomationConditions;
    actions?: AutomationAction[];
    isActive?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.triggerEvent !== undefined) patch.triggerEvent = input.triggerEvent;
  if (input.conditions !== undefined) patch.conditions = input.conditions;
  if (input.actions !== undefined) patch.actions = input.actions;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [row] = await db
    .update(automationRule)
    .set(patch)
    .where(
      and(
        eq(automationRule.id, input.ruleId),
        eq(automationRule.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function insertAutomationExecutionIfAbsent(
  input: CreateAutomationExecutionInput,
): Promise<AutomationExecution | null> {
  const [row] = await db
    .insert(automationExecution)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      ruleId: input.ruleId,
      eventId: input.eventId,
      status: 'PENDING',
      input: input.input,
      idempotencyKey: input.idempotencyKey,
      attemptCount: 0,
    })
    .onConflictDoNothing({
      target: [
        automationExecution.organizationId,
        automationExecution.idempotencyKey,
      ],
    })
    .returning();

  return row ?? null;
}

export async function claimAutomationExecution(
  executionId: string,
): Promise<AutomationExecution | null> {
  const [row] = await db
    .update(automationExecution)
    .set({
      status: 'RUNNING',
      attemptCount: sql`${automationExecution.attemptCount} + 1`,
      startedAt: new Date(),
      error: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(automationExecution.id, executionId),
        eq(automationExecution.status, 'PENDING'),
      ),
    )
    .returning();

  return row ?? null;
}

export async function saveAutomationExecutionProgress(
  executionId: string,
  result: AutomationExecutionResult,
): Promise<void> {
  await db
    .update(automationExecution)
    .set({ result, updatedAt: new Date() })
    .where(
      and(
        eq(automationExecution.id, executionId),
        eq(automationExecution.status, 'RUNNING'),
      ),
    );
}

export async function markAutomationExecutionSucceeded(
  executionId: string,
  result: AutomationExecutionResult,
): Promise<void> {
  await db
    .update(automationExecution)
    .set({
      status: 'SUCCEEDED',
      result,
      error: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(automationExecution.id, executionId));
}

export async function markAutomationExecutionPending(
  executionId: string,
  error: string,
): Promise<void> {
  await db
    .update(automationExecution)
    .set({
      status: 'PENDING',
      error,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(automationExecution.id, executionId),
        eq(automationExecution.status, 'RUNNING'),
      ),
    );
}

export async function markAutomationExecutionFailed(
  executionId: string,
  error: string,
): Promise<void> {
  await db
    .update(automationExecution)
    .set({
      status: 'FAILED',
      error,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(automationExecution.id, executionId));
}

export async function listAutomationExecutionsForRule(
  filter: ListAutomationExecutionsFilter,
): Promise<AutomationExecution[]> {
  const conditions = [
    eq(automationExecution.organizationId, filter.organizationId),
    eq(automationExecution.ruleId, filter.ruleId),
  ];
  if (filter.status) {
    conditions.push(eq(automationExecution.status, filter.status));
  }

  return db
    .select()
    .from(automationExecution)
    .where(and(...conditions))
    .orderBy(desc(automationExecution.createdAt))
    .limit(filter.limit)
    .offset(filter.offset);
}

/**
 * Interrupted RUNNING rows go back to PENDING until the attempt cap,
 * then they are closed as FAILED. Returns ids that should be queued again.
 */
export async function releaseStaleRunningExecutions(
  staleBefore: Date,
  maxAttempts: number,
): Promise<string[]> {
  const stale = await db
    .select()
    .from(automationExecution)
    .where(
      and(
        eq(automationExecution.status, 'RUNNING'),
        lte(automationExecution.startedAt, staleBefore),
      ),
    )
    .limit(50);

  const requeue: string[] = [];
  for (const row of stale) {
    if (row.attemptCount < maxAttempts) {
      const [updated] = await db
        .update(automationExecution)
        .set({
          status: 'PENDING',
          error: 'Retrying after an interrupted run',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(automationExecution.id, row.id),
            eq(automationExecution.status, 'RUNNING'),
          ),
        )
        .returning({ id: automationExecution.id });
      if (updated) requeue.push(updated.id);
    } else {
      await db
        .update(automationExecution)
        .set({
          status: 'FAILED',
          error: 'Stopped after an interrupted run',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(automationExecution.id, row.id),
            eq(automationExecution.status, 'RUNNING'),
          ),
        );
    }
  }

  return requeue;
}

export async function listDueFollowUpsForAutomation(
  now: Date,
  limit: number,
): Promise<DueFollowUpForAutomation[]> {
  const orgs = await db
    .select({ organizationId: automationRule.organizationId })
    .from(automationRule)
    .where(
      and(
        eq(automationRule.isActive, true),
        eq(automationRule.triggerEvent, 'FOLLOW_UP_DUE'),
      ),
    );

  const organizationIds = [
    ...new Set(orgs.map((row) => row.organizationId)),
  ];
  if (organizationIds.length === 0) return [];

  return db
    .select({
      id: customerFollowUp.id,
      organizationId: customerFollowUp.organizationId,
      customerId: customerFollowUp.customerId,
      jobId: customerFollowUp.jobId,
      type: customerFollowUp.type,
    })
    .from(customerFollowUp)
    .where(
      and(
        inArray(customerFollowUp.organizationId, organizationIds),
        inArray(customerFollowUp.status, ['PENDING', 'SCHEDULED']),
        lte(customerFollowUp.dueAt, now),
      ),
    )
    .orderBy(asc(customerFollowUp.dueAt))
    .limit(limit);
}
