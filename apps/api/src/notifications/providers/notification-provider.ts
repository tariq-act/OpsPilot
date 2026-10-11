import type { NotificationChannel } from '../../db/schema/customer-notification.js';

/**
 * Channel delivery contract. Real email/SMS/WhatsApp providers implement this.
 * The API never marks delivery success without going through a provider.
 */

export type NotificationSendInput = {
  notificationId: string;
  organizationId: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  /** Non-sensitive template data only. */
  payload: Record<string, unknown>;
};

export type NotificationSendResult = {
  providerMessageId?: string;
};

export abstract class NotificationProvider {
  abstract readonly channel: NotificationChannel;

  abstract send(input: NotificationSendInput): Promise<NotificationSendResult>;
}

export const NOTIFICATION_PROVIDERS = Symbol('NOTIFICATION_PROVIDERS');
