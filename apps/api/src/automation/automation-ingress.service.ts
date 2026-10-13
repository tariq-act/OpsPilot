import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  insertAutomationExecutionIfAbsent,
  listActiveAutomationRulesByTrigger,
} from '../db/queries/index.js';
import type { AutomationTrigger } from '../db/schema/automation.js';
import type { AutomationExecutionInput } from '../db/schema/automation.js';
import {
  automationDepth,
  MAX_AUTOMATION_DEPTH,
} from './automation.context.js';
import {
  EVENT_ID_PATTERN,
  idempotencyKeyFor,
  matchesConditions,
} from './automation.policy.js';
import { AutomationQueueService } from './automation-queue.service.js';

export type AutomationAcceptInput = {
  organizationId: string;
  triggerEvent: AutomationTrigger;
  eventId: string;
  context: {
    customerId?: string | null;
    jobId?: string | null;
    invoiceId?: string | null;
    paymentId?: string | null;
    followUpId?: string | null;
    followUpType?: string | null;
    currency?: string | null;
    method?: string | null;
  };
};

@Injectable()
export class AutomationIngressService {
  private readonly logger = new Logger(AutomationIngressService.name);

  constructor(private readonly queue: AutomationQueueService) {}

  /**
   * Fan a business event out to active rules.
   * Failures are logged and never thrown, so the originating
   * invoice, job, or payment still succeeds.
   */
  async accept(input: AutomationAcceptInput): Promise<void> {
    try {
      await this.acceptOrThrow(input);
    } catch {
      this.logger.warn(
        `Automation trigger failed trigger=${input.triggerEvent} org=${input.organizationId} event=${input.eventId}`,
      );
    }
  }

  private async acceptOrThrow(input: AutomationAcceptInput): Promise<void> {
    if (automationDepth() >= MAX_AUTOMATION_DEPTH) {
      this.logger.warn(
        `Skipped recursive automation trigger=${input.triggerEvent} org=${input.organizationId} event=${input.eventId}`,
      );
      return;
    }
    if (
      !EVENT_ID_PATTERN.test(input.eventId) ||
      !EVENT_ID_PATTERN.test(input.organizationId)
    ) {
      this.logger.warn(
        `Skipped automation trigger with an invalid id trigger=${input.triggerEvent}`,
      );
      return;
    }

    const rules = await listActiveAutomationRulesByTrigger(
      input.organizationId,
      input.triggerEvent,
    );
    if (rules.length === 0) return;

    const stored = toStoredInput(input);
    for (const rule of rules) {
      if (!matchesConditions(rule.conditions, stored)) continue;
      const created = await insertAutomationExecutionIfAbsent({
        id: randomUUID(),
        organizationId: input.organizationId,
        ruleId: rule.id,
        eventId: input.eventId,
        input: stored,
        idempotencyKey: idempotencyKeyFor(
          rule.id,
          input.triggerEvent,
          input.eventId,
        ),
      });
      if (created) {
        this.queue.enqueue(created.id);
      }
    }
  }
}

function toStoredInput(input: AutomationAcceptInput): AutomationExecutionInput {
  return {
    triggerEvent: input.triggerEvent,
    eventId: input.eventId,
    customerId: clean(input.context.customerId),
    jobId: clean(input.context.jobId),
    invoiceId: clean(input.context.invoiceId),
    paymentId: clean(input.context.paymentId),
    followUpId: clean(input.context.followUpId),
    followUpType: clean(input.context.followUpType),
    currency: clean(input.context.currency),
    method: clean(input.context.method),
  };
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || !EVENT_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}
