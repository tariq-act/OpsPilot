import type {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from '../../db/schema/customer-notification.js';

export class NotificationDto {
  id!: string;
  organizationId!: string;
  customerId!: string;
  eventType!: NotificationEventType;
  channel!: NotificationChannel;
  status!: NotificationStatus;
  recipient!: string;
  payload!: Record<string, unknown>;
  idempotencyKey!: string;
  attemptCount!: number;
  lastError!: string | null;
  sentAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class NotificationResponseDto {
  notification!: NotificationDto;
}

export class NotificationListResponseDto {
  notifications!: NotificationDto[];
}
