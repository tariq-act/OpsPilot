import { Logger } from '@nestjs/common';
import type { NotificationChannel } from '../../db/schema/customer-notification.js';
import {
  NotificationProvider,
  type NotificationSendInput,
  type NotificationSendResult,
} from './notification-provider.js';

function maskRecipient(recipient: string): string {
  const trimmed = recipient.trim();
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, 1);
    return `${visible}***@${domain}`;
  }
  if (trimmed.length <= 4) return '***';
  return `***${trimmed.slice(-4)}`;
}

/**
 * Development adapter: logs a sanitized send and resolves successfully.
 * Replace with real EMAIL / SMS / WhatsApp providers later.
 */
export class DevNotificationProvider extends NotificationProvider {
  private readonly logger = new Logger(DevNotificationProvider.name);

  constructor(readonly channel: NotificationChannel) {
    super();
  }

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    this.logger.log(
      `dev-send channel=${input.channel} notificationId=${input.notificationId} org=${input.organizationId} recipient=${maskRecipient(input.recipient)} subject=${input.subject}`,
    );
    return { providerMessageId: `dev-${input.notificationId}` };
  }
}
