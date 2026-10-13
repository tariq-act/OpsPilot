import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  claimAutomationExecution,
  findActiveInvoiceForJob,
  findAutomationRuleById,
  findCustomerInOrganization,
  findFollowUpInOrganization,
  findInvoiceInOrganization,
  findJobInOrganization,
  findNotificationByIdempotencyKey,
  findPaymentInOrganization,
  markAutomationExecutionFailed,
  markAutomationExecutionPending,
  markAutomationExecutionSucceeded,
  releaseStaleRunningExecutions,
  saveAutomationExecutionProgress,
} from '../db/queries/index.js';
import type {
  AutomationAction,
  AutomationExecution,
  AutomationExecutionResult,
  AutomationRule,
} from '../db/schema/automation.js';
import type { NotificationEventType } from '../db/schema/customer-notification.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { CustomerNotificationsService } from '../notifications/customer-notifications.service.js';
import { FollowUpsService } from '../notifications/follow-ups.service.js';
import { runInsideAutomation } from './automation.context.js';
import {
  isTransientFailure,
  MAX_AUTOMATION_ATTEMPTS,
  retryDelayMs,
  ruleConfigError,
  safeClientMessage,
  STALE_EXECUTION_MS,
} from './automation.policy.js';
import { AutomationQueueService } from './automation-queue.service.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import { AuditService } from '../audit/audit.service.js';

const REMINDABLE_INVOICE_STATUSES = new Set([
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
]);

@Injectable()
export class AutomationExecutorService {
  private readonly logger = new Logger(AutomationExecutorService.name);

  constructor(
    private readonly queue: AutomationQueueService,
    private readonly invoices: InvoicesService,
    private readonly notifications: CustomerNotificationsService,
    private readonly followUps: FollowUpsService,
    private readonly audit: AuditService,
  ) {}

  async recoverStale(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_EXECUTION_MS);
    const ids = await releaseStaleRunningExecutions(
      staleBefore,
      MAX_AUTOMATION_ATTEMPTS,
    );
    for (const id of ids) this.queue.enqueue(id);
  }

  async run(executionId: string): Promise<void> {
    const claimed = await claimAutomationExecution(executionId);
    if (!claimed) return;

    let rule: AutomationRule | null = null;
    try {
      rule = await findAutomationRuleById(claimed.ruleId);
      if (!rule || rule.organizationId !== claimed.organizationId) {
        await this.failExecution(
          claimed,
          'Automation rule was not found',
        );
        return;
      }
      if (!rule.isActive) {
        await this.failExecution(
          claimed,
          'Automation rule is inactive',
          rule.triggerEvent,
        );
        return;
      }
      if (ruleConfigError(rule.triggerEvent, rule.conditions, rule.actions)) {
        await this.failExecution(
          claimed,
          'Automation rule configuration is invalid',
          rule.triggerEvent,
        );
        return;
      }

      const result = await runInsideAutomation(() =>
        this.perform(rule!, claimed),
      );
      await markAutomationExecutionSucceeded(claimed.id, result);
    } catch (error) {
      const message = safeClientMessage(error);
      if (
        isTransientFailure(error) &&
        claimed.attemptCount < MAX_AUTOMATION_ATTEMPTS
      ) {
        await markAutomationExecutionPending(claimed.id, message);
        this.queue.enqueue(claimed.id, retryDelayMs(claimed.attemptCount));
        this.logger.warn(
          `Retrying automation execution=${claimed.id} attempt=${claimed.attemptCount}`,
        );
        return;
      }
      await this.failExecution(
        claimed,
        message,
        rule?.triggerEvent,
      );
      this.logger.warn(`Automation execution failed execution=${claimed.id}`);
    }
  }

  private async failExecution(
    execution: AutomationExecution,
    reason: string,
    trigger?: string,
  ): Promise<void> {
    await markAutomationExecutionFailed(execution.id, reason);
    await this.audit.record({
      organizationId: execution.organizationId,
      actorUserId: null,
      action: AuditAction.AUTOMATION_EXECUTION_FAILED,
      entityType: AuditEntityType.AUTOMATION_EXECUTION,
      entityId: execution.id,
      metadata: {
        ruleId: execution.ruleId,
        ...(trigger !== undefined ? { trigger } : {}),
        reason,
      },
    });
  }

  private async perform(
    rule: AutomationRule,
    execution: AutomationExecution,
  ): Promise<AutomationExecutionResult> {
    const actions = priorSucceeded(execution.result);

    if (rule.triggerEvent === 'FOLLOW_UP_DUE') {
      const followUpId = execution.input.followUpId;
      const followUp = followUpId
        ? await findFollowUpInOrganization(
            execution.organizationId,
            followUpId,
          )
        : null;
      if (
        !followUp ||
        followUp.status === 'COMPLETED' ||
        followUp.status === 'CANCELLED'
      ) {
        return { outcome: 'closed', actions };
      }
    }

    for (let index = 0; index < rule.actions.length; index += 1) {
      if (actions.some((action) => action.index === index)) continue;
      const action = rule.actions[index];
      if (!action) continue;
      const output = await this.runAction(rule, execution, action, index);
      actions.push({
        index,
        type: action.type,
        status: 'SUCCEEDED',
        output,
      });
      await saveAutomationExecutionProgress(execution.id, {
        outcome: 'completed',
        actions,
      });
    }

    return { outcome: 'completed', actions };
  }

  private async runAction(
    rule: AutomationRule,
    execution: AutomationExecution,
    action: AutomationAction,
    index: number,
  ): Promise<Record<string, string>> {
    switch (action.type) {
      case 'CREATE_INVOICE':
        return this.createInvoice(rule, execution, action);
      case 'SEND_NOTIFICATION':
        return this.sendNotification(rule, execution, action, index);
      case 'SCHEDULE_FOLLOW_UP':
        return this.scheduleFollowUp(rule, execution, action);
      case 'SEND_PAYMENT_REMINDER':
        return this.sendPaymentReminder(execution, action, index);
      default:
        throw new BadRequestException({
          statusCode: 400,
          message: 'Unknown action type',
          error: 'Bad Request',
        });
    }
  }

  private async createInvoice(
    rule: AutomationRule,
    execution: AutomationExecution,
    action: AutomationAction,
  ): Promise<Record<string, string>> {
    const customerId = this.requireCustomer(execution);
    const jobId = execution.input.jobId;
    if (!jobId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'This event has no job',
        error: 'Bad Request',
      });
    }
    if (!action.items || action.items.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Create invoice requires at least one line item',
        error: 'Bad Request',
      });
    }

    const dueAt =
      action.dueInDays === undefined
        ? undefined
        : new Date(
            Date.now() + action.dueInDays * 24 * 60 * 60 * 1000,
          ).toISOString();

    try {
      const created = await this.invoices.create(
        rule.createdBy,
        execution.organizationId,
        {
          customerId,
          jobId,
          items: action.items,
          discount: action.discount,
          tax: action.tax,
          dueAt,
        },
      );
      return { invoiceId: created.invoice.id };
    } catch (error) {
      if (error instanceof ConflictException) {
        const existing = await findActiveInvoiceForJob(
          execution.organizationId,
          jobId,
        );
        if (existing) return { invoiceId: existing.id };
      }
      throw error;
    }
  }

  private async scheduleFollowUp(
    rule: AutomationRule,
    execution: AutomationExecution,
    action: AutomationAction,
  ): Promise<Record<string, string>> {
    const customerId = this.requireCustomer(execution);
    if (!action.followUpType || action.dueInDays === undefined) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Follow-up type and dueInDays are required',
        error: 'Bad Request',
      });
    }
    const dueAt = new Date(
      Date.now() + action.dueInDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const created = await this.followUps.create(
      rule.createdBy,
      execution.organizationId,
      {
        customerId,
        jobId: execution.input.jobId ?? undefined,
        type: action.followUpType,
        dueAt,
        notes: action.notes,
      },
    );
    return { followUpId: created.followUp.id };
  }

  private async sendNotification(
    rule: AutomationRule,
    execution: AutomationExecution,
    action: AutomationAction,
    index: number,
  ): Promise<Record<string, string>> {
    const customerId = this.requireCustomer(execution);
    const eventType = notificationEventForTrigger(rule.triggerEvent);
    const payload = await this.notificationPayload(
      execution,
      eventType,
      customerId,
    );
    return this.enqueueNotification({
      organizationId: execution.organizationId,
      customerId,
      eventType,
      channel: action.channel,
      idempotencyKey: `automation:${execution.id}:${index}`,
      payload,
    });
  }

  private async sendPaymentReminder(
    execution: AutomationExecution,
    action: AutomationAction,
    index: number,
  ): Promise<Record<string, string>> {
    const customerId = this.requireCustomer(execution);
    const invoice = await this.resolveReminderInvoice(execution, customerId);
    return this.enqueueNotification({
      organizationId: execution.organizationId,
      customerId,
      eventType: 'PAYMENT_REMINDER',
      channel: action.channel,
      idempotencyKey: `automation:${execution.id}:${index}`,
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
      },
    });
  }

  private async resolveReminderInvoice(
    execution: AutomationExecution,
    customerId: string,
  ) {
    const invoice = execution.input.invoiceId
      ? await findInvoiceInOrganization(
          execution.organizationId,
          execution.input.invoiceId,
        )
      : execution.input.jobId
        ? await findActiveInvoiceForJob(
            execution.organizationId,
            execution.input.jobId,
          )
        : null;

    if (!invoice || invoice.customerId !== customerId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No invoice is available for this reminder',
        error: 'Bad Request',
      });
    }
    if (!REMINDABLE_INVOICE_STATUSES.has(invoice.status)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invoice is not awaiting payment',
        error: 'Bad Request',
      });
    }
    return invoice;
  }

  private async notificationPayload(
    execution: AutomationExecution,
    eventType: NotificationEventType,
    customerId: string,
  ): Promise<Record<string, unknown>> {
    if (eventType === 'JOB_COMPLETED') {
      const jobId = execution.input.jobId;
      const job = jobId
        ? await findJobInOrganization(execution.organizationId, jobId)
        : null;
      if (!job || job.customerId !== customerId) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Job was not found for this notification',
          error: 'Bad Request',
        });
      }
      return {
        jobId: job.id,
        completedAt: job.completedAt?.toISOString() ?? null,
      };
    }

    if (eventType === 'INVOICE_SENT') {
      const invoiceId = execution.input.invoiceId;
      const invoice = invoiceId
        ? await findInvoiceInOrganization(
            execution.organizationId,
            invoiceId,
          )
        : null;
      if (!invoice || invoice.customerId !== customerId) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Invoice was not found for this notification',
          error: 'Bad Request',
        });
      }
      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
      };
    }

    if (eventType === 'PAYMENT_CONFIRMED') {
      const paymentId = execution.input.paymentId;
      const payment = paymentId
        ? await findPaymentInOrganization(
            execution.organizationId,
            paymentId,
          )
        : null;
      if (!payment || payment.customerId !== customerId) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Payment was not found for this notification',
          error: 'Bad Request',
        });
      }
      return {
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      };
    }

    return {
      followUpId: execution.input.followUpId,
      followUpType: execution.input.followUpType,
    };
  }

  private async enqueueNotification(input: {
    organizationId: string;
    customerId: string;
    eventType: NotificationEventType;
    channel?: AutomationAction['channel'];
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<Record<string, string>> {
    const customer = await findCustomerInOrganization(
      input.organizationId,
      input.customerId,
    );
    if (!customer) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Customer was not found',
        error: 'Bad Request',
      });
    }

    try {
      const created = await this.notifications.notifyFromEventOrThrow({
        organizationId: input.organizationId,
        customerId: input.customerId,
        eventType: input.eventType,
        channel: input.channel,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
      });
      if (!created) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'No reachable contact for this customer',
          error: 'Bad Request',
        });
      }
      return { notificationId: created.id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await findNotificationByIdempotencyKey(
        input.organizationId,
        input.idempotencyKey,
      );
      if (!existing) throw error;
      return { notificationId: existing.id };
    }
  }

  private requireCustomer(execution: AutomationExecution): string {
    const customerId = execution.input.customerId;
    if (!customerId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'This event has no customer',
        error: 'Bad Request',
      });
    }
    return customerId;
  }
}

function notificationEventForTrigger(
  trigger: AutomationRule['triggerEvent'],
): NotificationEventType {
  switch (trigger) {
    case 'JOB_COMPLETED':
      return 'JOB_COMPLETED';
    case 'INVOICE_SENT':
      return 'INVOICE_SENT';
    case 'PAYMENT_RECEIVED':
      return 'PAYMENT_CONFIRMED';
    case 'FOLLOW_UP_DUE':
      return 'FOLLOW_UP_DUE';
  }
}

function priorSucceeded(
  result: AutomationExecutionResult | null,
): AutomationExecutionResult['actions'] {
  if (!result || !Array.isArray(result.actions)) return [];
  return result.actions.filter((action) => action.status === 'SUCCEEDED');
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && (current as { code: unknown }).code === '23505') {
      return true;
    }
    current =
      'cause' in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
}
