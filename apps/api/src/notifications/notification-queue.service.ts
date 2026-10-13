import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  claimNotificationForProcessing,
  markNotificationFailed,
  markNotificationSent,
} from '../db/queries/index.js';
import type { NotificationChannel } from '../db/schema/customer-notification.js';
import {
  NOTIFICATION_PROVIDERS,
  type NotificationProvider,
} from './providers/notification-provider.js';
import { buildNotificationContent } from './notification-content.js';

const MAX_ATTEMPTS = 5;

/**
 * In-process FIFO queue for notification delivery.
 * Swap for BullMQ/SQS later without changing business trigger call sites.
 */
@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly queue: string[] = [];
  private draining = false;
  private stopped = false;
  private readonly providersByChannel: Map<
    NotificationChannel,
    NotificationProvider
  >;

  constructor(
    @Inject(NOTIFICATION_PROVIDERS)
    providers: NotificationProvider[],
  ) {
    this.providersByChannel = new Map(
      providers.map((provider) => [provider.channel, provider]),
    );
  }

  onModuleDestroy() {
    this.stopped = true;
    this.queue.length = 0;
  }

  enqueue(notificationId: string): void {
    if (this.stopped) return;
    this.queue.push(notificationId);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining || this.stopped) return;
    this.draining = true;

    try {
      while (this.queue.length > 0 && !this.stopped) {
        const notificationId = this.queue.shift();
        if (!notificationId) continue;
        await this.processOne(notificationId);
      }
    } finally {
      this.draining = false;
      if (this.queue.length > 0 && !this.stopped) {
        void this.drain();
      }
    }
  }

  private async processOne(notificationId: string): Promise<void> {
    const claimed = await claimNotificationForProcessing(notificationId);
    if (!claimed) {
      return;
    }

    if (claimed.attemptCount > MAX_ATTEMPTS) {
      await markNotificationFailed(
        notificationId,
        `Exceeded max delivery attempts (${MAX_ATTEMPTS})`,
      );
      return;
    }

    const provider = this.providersByChannel.get(claimed.channel);
    if (!provider) {
      await markNotificationFailed(
        notificationId,
        `No provider configured for channel ${claimed.channel}`,
      );
      return;
    }

    try {
      const content = buildNotificationContent(
        claimed.eventType,
        claimed.payload,
      );
      await provider.send({
        notificationId: claimed.id,
        organizationId: claimed.organizationId,
        channel: claimed.channel,
        recipient: claimed.recipient,
        subject: content.subject,
        body: content.body,
        payload: claimed.payload,
      });
      await markNotificationSent(notificationId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Delivery failed';
      // Never log recipient or payload contents (may include customer contact).
      this.logger.warn(
        `Notification delivery failed id=${notificationId} channel=${claimed.channel}: ${message}`,
      );
      await markNotificationFailed(notificationId, message.slice(0, 500));
    }
  }
}
