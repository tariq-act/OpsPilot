import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createCustomerNotification,
  findActiveMembership,
  findCustomerInOrganization,
  findNotificationByIdempotencyKey,
  findNotificationInOrganization,
  listNotificationsForOrganization,
  resetNotificationForRetry,
} from '../db/queries/index.js';
import type {
  CustomerNotification,
  NotificationChannel,
  NotificationEventType,
} from '../db/schema/customer-notification.js';
import type { Customer } from '../db/schema/customer.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationQueueService } from './notification-queue.service.js';

const NOTIFICATION_VIEWER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

const MAX_RETRY_ATTEMPTS = 5;

export type NotifyCustomerEventInput = {
  organizationId: string;
  customerId: string;
  eventType: NotificationEventType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  /** Defaults to EMAIL when customer has email, otherwise SMS. */
  channel?: NotificationChannel;
};

function toNotificationDto(row: CustomerNotification) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    eventType: row.eventType,
    channel: row.channel,
    status: row.status,
    recipient: row.recipient,
    payload: row.payload,
    idempotencyKey: row.idempotencyKey,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function resolveChannel(
  customer: Customer,
  preferred?: NotificationChannel,
): { channel: NotificationChannel; recipient: string } | null {
  if (preferred === 'EMAIL') {
    if (!customer.email) return null;
    return { channel: 'EMAIL', recipient: customer.email };
  }
  if (preferred === 'SMS' || preferred === 'WHATSAPP') {
    return { channel: preferred, recipient: customer.phone };
  }
  if (customer.email) {
    return { channel: 'EMAIL', recipient: customer.email };
  }
  if (customer.phone) {
    return { channel: 'SMS', recipient: customer.phone };
  }
  return null;
}

@Injectable()
export class CustomerNotificationsService {
  private readonly logger = new Logger(CustomerNotificationsService.name);

  constructor(private readonly queue: NotificationQueueService) {}

  /**
   * Called from business services after a successful domain mutation.
   * Idempotent: duplicate idempotencyKey returns the existing row.
   * Failures are logged and never thrown to the caller.
   */
  async notifyFromEvent(input: NotifyCustomerEventInput): Promise<void> {
    try {
      await this.notifyFromEventOrThrow(input);
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue notification eventType=${input.eventType} org=${input.organizationId}`,
      );
      if (error instanceof Error) {
        this.logger.warn(error.message);
      }
    }
  }

  async notifyFromEventOrThrow(
    input: NotifyCustomerEventInput,
  ): Promise<CustomerNotification | null> {
    const existing = await findNotificationByIdempotencyKey(
      input.organizationId,
      input.idempotencyKey,
    );
    if (existing) {
      return existing;
    }

    const customer = await findCustomerInOrganization(
      input.organizationId,
      input.customerId,
    );
    if (!customer) {
      this.logger.warn(
        `Skip notification: customer not found for event ${input.eventType}`,
      );
      return null;
    }

    const resolved = resolveChannel(customer, input.channel);
    if (!resolved) {
      this.logger.warn(
        `Skip notification: no recipient for customer on event ${input.eventType}`,
      );
      return null;
    }

    const created = await createCustomerNotification({
      id: randomUUID(),
      organizationId: input.organizationId,
      customerId: input.customerId,
      eventType: input.eventType,
      channel: resolved.channel,
      recipient: resolved.recipient,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
    });

    this.queue.enqueue(created.id);
    return created;
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListNotificationsQueryDto,
  ) {
    await this.requireViewer(organizationId, actorUserId);

    const rows = await listNotificationsForOrganization({
      organizationId,
      status: query.status,
      eventType: query.eventType,
      customerId: query.customerId,
      channel: query.channel,
    });

    return { notifications: rows.map(toNotificationDto) };
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    notificationId: string,
  ) {
    await this.requireViewer(organizationId, actorUserId);

    const row = await findNotificationInOrganization(
      organizationId,
      notificationId,
    );
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Notification not found',
        error: 'Not Found',
      });
    }

    return { notification: toNotificationDto(row) };
  }

  async retry(
    actorUserId: string,
    organizationId: string,
    notificationId: string,
  ) {
    await this.requireViewer(organizationId, actorUserId);

    const existing = await findNotificationInOrganization(
      organizationId,
      notificationId,
    );
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Notification not found',
        error: 'Not Found',
      });
    }

    if (existing.status !== 'FAILED') {
      throw new ConflictException({
        statusCode: 409,
        message: `Only FAILED notifications can be retried (current: ${existing.status})`,
        error: 'Conflict',
      });
    }

    if (existing.attemptCount >= MAX_RETRY_ATTEMPTS) {
      throw new ConflictException({
        statusCode: 409,
        message: `Notification exceeded max retry attempts (${MAX_RETRY_ATTEMPTS})`,
        error: 'Conflict',
      });
    }

    const reset = await resetNotificationForRetry(
      organizationId,
      notificationId,
    );
    if (!reset) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Unable to retry notification',
        error: 'Conflict',
      });
    }

    this.queue.enqueue(reset.id);
    return { notification: toNotificationDto(reset) };
  }

  private async requireViewer(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await findActiveMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not a member of this organization',
        error: 'Forbidden',
      });
    }
    if (
      !(NOTIFICATION_VIEWER_ROLES as readonly string[]).includes(
        membership.role,
      )
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not allowed to view notifications',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
