import { Module } from '@nestjs/common';
import { CustomerNotificationsService } from './customer-notifications.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { NotificationsController } from './notifications.controller.js';
import { DevNotificationProvider } from './providers/dev-notification.provider.js';
import { NOTIFICATION_PROVIDERS } from './providers/notification-provider.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: () => [
        new DevNotificationProvider('EMAIL'),
        new DevNotificationProvider('SMS'),
        new DevNotificationProvider('WHATSAPP'),
      ],
    },
    NotificationQueueService,
    CustomerNotificationsService,
  ],
  exports: [CustomerNotificationsService],
})
export class NotificationsModule {}
