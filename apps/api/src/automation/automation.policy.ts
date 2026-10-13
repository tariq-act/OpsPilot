import type {
  AutomationAction,
  AutomationActionItem,
  AutomationConditions,
  AutomationExecutionInput,
  AutomationTrigger,
} from '../db/schema/automation.js';

export const AUTOMATION_ACTION_TYPES = [
  'CREATE_INVOICE',
  'SEND_NOTIFICATION',
  'SCHEDULE_FOLLOW_UP',
  'SEND_PAYMENT_REMINDER',
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export const MAX_AUTOMATION_ATTEMPTS = 5;
export const MAX_AUTOMATION_ACTIONS = 5;
export const MAX_AUTOMATION_CONDITIONS = 10;
export const STALE_EXECUTION_MS = 5 * 60 * 1000;

const MONEY = /^\d+(\.\d{1,2})?$/;
const SAFE_TOKEN = /^[A-Za-z0-9.:_-]{1,128}$/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  '57P01',
  '40001',
  '40P01',
  '08006',
  '08001',
  '53300',
]);

/**
 * Actions that are safe for each trigger.
 * Invoice creation is only allowed after a job completes.
 * Payment reminders are not sent for a payment that already succeeded.
 * A due follow-up cannot schedule another follow-up.
 */
export const PERMITTED_ACTIONS: Record<
  AutomationTrigger,
  readonly AutomationActionType[]
> = {
  JOB_COMPLETED: [
    'CREATE_INVOICE',
    'SEND_NOTIFICATION',
    'SCHEDULE_FOLLOW_UP',
  ],
  INVOICE_SENT: [
    'SEND_NOTIFICATION',
    'SCHEDULE_FOLLOW_UP',
    'SEND_PAYMENT_REMINDER',
  ],
  PAYMENT_RECEIVED: ['SEND_NOTIFICATION', 'SCHEDULE_FOLLOW_UP'],
  FOLLOW_UP_DUE: ['SEND_NOTIFICATION', 'SEND_PAYMENT_REMINDER'],
};

export const CONDITION_FIELDS: Record<
  AutomationTrigger,
  readonly string[]
> = {
  JOB_COMPLETED: ['customerId', 'jobId'],
  INVOICE_SENT: ['customerId', 'jobId', 'invoiceId', 'currency'],
  PAYMENT_RECEIVED: [
    'customerId',
    'jobId',
    'invoiceId',
    'paymentId',
    'currency',
    'method',
  ],
  FOLLOW_UP_DUE: ['customerId', 'jobId', 'followUpId', 'followUpType'],
};

const ACTION_FIELDS: Record<AutomationActionType, readonly string[]> = {
  CREATE_INVOICE: ['type', 'items', 'discount', 'tax', 'dueInDays'],
  SEND_NOTIFICATION: ['type', 'channel'],
  SCHEDULE_FOLLOW_UP: ['type', 'followUpType', 'dueInDays', 'notes'],
  SEND_PAYMENT_REMINDER: ['type', 'channel'],
};

const ITEM_TYPES = new Set(['LABOR', 'PARTS', 'OTHER', 'FEE']);
const CHANNELS = new Set(['EMAIL', 'SMS', 'WHATSAPP']);
const FOLLOW_UP_TYPES = new Set(['FEEDBACK', 'MAINTENANCE_REMINDER']);
const TRIGGERS = new Set<string>([
  'JOB_COMPLETED',
  'INVOICE_SENT',
  'PAYMENT_RECEIVED',
  'FOLLOW_UP_DUE',
]);

export function isAutomationTrigger(
  value: string,
): value is AutomationTrigger {
  return TRIGGERS.has(value);
}

export function retryDelayMs(attempt: number): number {
  const step = Math.min(Math.max(attempt, 1), MAX_AUTOMATION_ATTEMPTS);
  return Math.min(30_000, 1000 * 2 ** (step - 1));
}

export function redactSensitive(value: string): string {
  return value.replace(EMAIL, '[redacted]').replace(PHONE, '[redacted]');
}

export function isTransientFailure(error: unknown): boolean {
  if (typeof error === 'object' && error && 'getStatus' in error) {
    const getStatus = (error as { getStatus: () => number }).getStatus;
    if (typeof getStatus === 'function') {
      return getStatus.call(error) >= 500;
    }
  }
  if (typeof error === 'object' && error && 'code' in error) {
    return TRANSIENT_CODES.has(String((error as { code: unknown }).code));
  }
  return false;
}

export function safeClientMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'getResponse' in error) {
    const getResponse = (error as { getResponse: () => unknown }).getResponse;
    if (typeof getResponse === 'function') {
      const response = getResponse.call(error);
      const message = messageFromResponse(response);
      if (message) return redactSensitive(message).slice(0, 500);
    }
  }
  return 'Automation action failed';
}

function messageFromResponse(response: unknown): string | null {
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object' || !('message' in response)) {
    return null;
  }
  const message = (response as { message: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join('; ');
  }
  return null;
}

export function contextRecord(
  input: AutomationExecutionInput,
): Record<string, string> {
  return {
    customerId: input.customerId ?? '',
    jobId: input.jobId ?? '',
    invoiceId: input.invoiceId ?? '',
    paymentId: input.paymentId ?? '',
    followUpId: input.followUpId ?? '',
    followUpType: input.followUpType ?? '',
    currency: input.currency ?? '',
    method: input.method ?? '',
  };
}

export function matchesConditions(
  conditions: AutomationConditions,
  input: AutomationExecutionInput,
): boolean {
  if (!Array.isArray(conditions.rules) || conditions.rules.length === 0) {
    return conditions.match === 'all' || conditions.match === 'any';
  }
  const context = contextRecord(input);
  const allowed = new Set(CONDITION_FIELDS[input.triggerEvent]);
  const results = conditions.rules.map((rule) => {
    if (!allowed.has(rule.field)) return false;
    const actual = context[rule.field] ?? '';
    if (rule.operator === 'eq') return actual === rule.value;
    if (rule.operator === 'neq') return actual !== rule.value;
    return false;
  });
  if (conditions.match === 'any') return results.some(Boolean);
  if (conditions.match === 'all') return results.every(Boolean);
  return false;
}

export function ruleConfigError(
  triggerEvent: string,
  conditions: AutomationConditions,
  actions: AutomationAction[],
): string | null {
  if (!isAutomationTrigger(triggerEvent)) {
    return 'Trigger must be JOB_COMPLETED, INVOICE_SENT, PAYMENT_RECEIVED, or FOLLOW_UP_DUE';
  }
  if (!conditions || (conditions.match !== 'all' && conditions.match !== 'any')) {
    return 'Conditions match must be all or any';
  }
  if (!Array.isArray(conditions.rules)) {
    return 'Conditions rules must be a list';
  }
  if (conditions.rules.length > MAX_AUTOMATION_CONDITIONS) {
    return `A rule can have at most ${MAX_AUTOMATION_CONDITIONS} conditions`;
  }
  const allowedFields = new Set(CONDITION_FIELDS[triggerEvent]);
  for (const rule of conditions.rules) {
    if (!rule || !allowedFields.has(rule.field)) {
      return 'A condition field is not allowed for this trigger';
    }
    if (rule.operator !== 'eq' && rule.operator !== 'neq') {
      return 'Condition operator must be eq or neq';
    }
    if (typeof rule.value !== 'string' || !SAFE_TOKEN.test(rule.value)) {
      return 'Condition value must be 1 to 128 letters, numbers, or .:_-';
    }
  }
  if (!Array.isArray(actions) || actions.length === 0) {
    return 'At least one action is required';
  }
  if (actions.length > MAX_AUTOMATION_ACTIONS) {
    return `A rule can have at most ${MAX_AUTOMATION_ACTIONS} actions`;
  }
  const permitted = new Set(PERMITTED_ACTIONS[triggerEvent]);
  let invoiceCreates = 0;
  for (const action of actions) {
    const shape = actionShapeError(action);
    if (shape) return shape;
    if (!permitted.has(action.type)) {
      return `${action.type} is not allowed for ${triggerEvent}`;
    }
    if (action.type === 'CREATE_INVOICE') invoiceCreates += 1;
  }
  if (invoiceCreates > 1) {
    return 'A rule can create only one invoice';
  }
  return null;
}

export function actionShapeError(action: AutomationAction): string | null {
  if (!action || typeof action !== 'object') return 'Action is required';
  if (!action.type || !ACTION_FIELDS[action.type]) return 'Unknown action type';
  const allowed = new Set(ACTION_FIELDS[action.type]);
  for (const key of Object.keys(action)) {
    const value = (action as unknown as Record<string, unknown>)[key];
    if (value !== undefined && !allowed.has(key)) {
      const safeKey = key.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40);
      return `Field ${safeKey || 'unknown'} is not allowed on this action`;
    }
  }
  if (action.type === 'CREATE_INVOICE') {
    if (!Array.isArray(action.items) || action.items.length === 0) {
      return 'Create invoice requires at least one line item';
    }
    if (action.items.length > 20) {
      return 'Create invoice accepts at most 20 line items';
    }
    for (const item of action.items) {
      const itemError = itemShapeError(item);
      if (itemError) return itemError;
    }
    if (action.discount !== undefined && !MONEY.test(action.discount)) {
      return 'Discount must be a non-negative decimal with up to 2 places';
    }
    if (action.tax !== undefined && !MONEY.test(action.tax)) {
      return 'Tax must be a non-negative decimal with up to 2 places';
    }
    if (
      action.dueInDays !== undefined &&
      !isWholeNumber(action.dueInDays, 0, 365)
    ) {
      return 'Invoice dueInDays must be a whole number from 0 to 365';
    }
  }
  if (action.type === 'SCHEDULE_FOLLOW_UP') {
    if (!action.followUpType || !FOLLOW_UP_TYPES.has(action.followUpType)) {
      return 'Follow-up type must be FEEDBACK or MAINTENANCE_REMINDER';
    }
    if (!isWholeNumber(action.dueInDays, 1, 365)) {
      return 'Follow-up dueInDays must be a whole number from 1 to 365';
    }
    if (action.notes !== undefined) {
      if (typeof action.notes !== 'string' || action.notes.length > 2000) {
        return 'Notes must be at most 2000 characters';
      }
    }
  }
  if (
    (action.type === 'SEND_NOTIFICATION' ||
      action.type === 'SEND_PAYMENT_REMINDER') &&
    action.channel !== undefined &&
    !CHANNELS.has(action.channel)
  ) {
    return 'Channel must be EMAIL, SMS, or WHATSAPP';
  }
  return null;
}

function itemShapeError(item: AutomationActionItem): string | null {
  if (!item || !ITEM_TYPES.has(item.type)) {
    return 'Item type must be LABOR, PARTS, OTHER, or FEE';
  }
  if (
    typeof item.description !== 'string' ||
    item.description.trim().length === 0 ||
    item.description.length > 500
  ) {
    return 'Item description must be 1 to 500 characters';
  }
  if (typeof item.quantity !== 'string' || !MONEY.test(item.quantity)) {
    return 'Quantity must be a non-negative decimal with up to 2 places';
  }
  if (typeof item.unitPrice !== 'string' || !MONEY.test(item.unitPrice)) {
    return 'Unit price must be a non-negative decimal with up to 2 places';
  }
  return null;
}

function isWholeNumber(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

export function idempotencyKeyFor(
  ruleId: string,
  triggerEvent: AutomationTrigger,
  eventId: string,
): string {
  return `${ruleId}:${triggerEvent}:${eventId}`;
}

export const EVENT_ID_PATTERN = SAFE_TOKEN;
