import type { NotificationEventType } from '../db/schema/customer-notification.js';

export type NotificationContent = {
  subject: string;
  body: string;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Build customer-facing copy from event payload (no secrets). */
export function buildNotificationContent(
  eventType: NotificationEventType,
  payload: Record<string, unknown>,
): NotificationContent {
  switch (eventType) {
    case 'JOB_SCHEDULED': {
      const start = asString(payload.scheduledStart, 'the scheduled time');
      return {
        subject: 'Your service appointment is confirmed',
        body: `Your service appointment is confirmed for ${start}.`,
      };
    }
    case 'JOB_RESCHEDULED': {
      const start = asString(payload.scheduledStart, 'the new time');
      return {
        subject: 'Your service appointment was rescheduled',
        body: `Your service appointment was rescheduled to ${start}.`,
      };
    }
    case 'TECHNICIAN_ASSIGNED':
      return {
        subject: 'A technician was assigned to your job',
        body: 'A technician has been assigned to your service job.',
      };
    case 'JOB_COMPLETED':
      return {
        subject: 'Your service has been completed',
        body: 'Your service has been completed. Thank you for choosing us.',
      };
    case 'INVOICE_SENT': {
      const number = asString(payload.invoiceNumber, 'your invoice');
      return {
        subject: 'Your invoice is ready',
        body: `Invoice ${number} is ready for your review.`,
      };
    }
    case 'PAYMENT_CONFIRMED': {
      const amount = asString(payload.amount, 'your payment');
      return {
        subject: 'Payment confirmation',
        body: `We received your payment of ${amount}. Thank you.`,
      };
    }
    case 'PAYMENT_REMINDER': {
      const number = asString(payload.invoiceNumber, 'your invoice');
      return {
        subject: 'Payment reminder',
        body: `Invoice ${number} is awaiting payment.`,
      };
    }
    case 'FOLLOW_UP_DUE':
      return {
        subject: 'Follow-up for your service',
        body: 'A follow-up is due for your recent service.',
      };
  }
}
