import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  customerNotification,
  type CustomerNotification,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationStatus,
} from '../schema/customer-notification.js';

export type DbExecutor = Pick<typeof db, 'insert' | 'update' | 'select'>;

export type CreateCustomerNotificationInput = {
  id: string;
  organizationId: string;
  customerId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipient: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export type ListNotificationsFilter = {
  organizationId: string;
  status?: NotificationStatus;
  eventType?: NotificationEventType;
  customerId?: string;
  channel?: NotificationChannel;
};

export async function createCustomerNotification(
  input: CreateCustomerNotificationInput,
  executor: DbExecutor = db,
): Promise<CustomerNotification> {
  const [row] = await executor
    .insert(customerNotification)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      eventType: input.eventType,
      channel: input.channel,
      status: 'PENDING',
      recipient: input.recipient,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      attemptCount: 0,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create customer notification');
  }
  return row;
}

export async function findNotificationByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string,
  executor: DbExecutor = db,
): Promise<CustomerNotification | null> {
  const [row] = await executor
    .select()
    .from(customerNotification)
    .where(
      and(
        eq(customerNotification.organizationId, organizationId),
        eq(customerNotification.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findNotificationInOrganization(
  organizationId: string,
  notificationId: string,
  executor: DbExecutor = db,
): Promise<CustomerNotification | null> {
  const [row] = await executor
    .select()
    .from(customerNotification)
    .where(
      and(
        eq(customerNotification.id, notificationId),
        eq(customerNotification.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listNotificationsForOrganization(
  filter: ListNotificationsFilter,
): Promise<CustomerNotification[]> {
  const conditions: SQL[] = [
    eq(customerNotification.organizationId, filter.organizationId),
  ];

  if (filter.status) {
    conditions.push(eq(customerNotification.status, filter.status));
  }
  if (filter.eventType) {
    conditions.push(eq(customerNotification.eventType, filter.eventType));
  }
  if (filter.customerId) {
    conditions.push(eq(customerNotification.customerId, filter.customerId));
  }
  if (filter.channel) {
    conditions.push(eq(customerNotification.channel, filter.channel));
  }

  return db
    .select()
    .from(customerNotification)
    .where(and(...conditions))
    .orderBy(desc(customerNotification.createdAt));
}

/** Atomically PENDING → PROCESSING and bump attemptCount. */
export async function claimNotificationForProcessing(
  notificationId: string,
  executor: DbExecutor = db,
): Promise<CustomerNotification | null> {
  const [row] = await executor
    .update(customerNotification)
    .set({
      status: 'PROCESSING',
      attemptCount: sql`${customerNotification.attemptCount} + 1`,
    })
    .where(
      and(
        eq(customerNotification.id, notificationId),
        eq(customerNotification.status, 'PENDING'),
      ),
    )
    .returning();

  return row ?? null;
}

export async function markNotificationSent(
  notificationId: string,
  sentAt: Date = new Date(),
  executor: DbExecutor = db,
): Promise<CustomerNotification | null> {
  const [row] = await executor
    .update(customerNotification)
    .set({
      status: 'SENT',
      sentAt,
      lastError: null,
    })
    .where(eq(customerNotification.id, notificationId))
    .returning();

  return row ?? null;
}

export async function markNotificationFailed(
  notificationId: string,
  lastError: string,
  executor: DbExecutor = db,
): Promise<CustomerNotification | null> {
  const [row] = await executor
    .update(customerNotification)
    .set({
      status: 'FAILED',
      lastError,
    })
    .where(eq(customerNotification.id, notificationId))
    .returning();

  return row ?? null;
}

export async function resetNotificationForRetry(
  organizationId: string,
  notificationId: string,
  executor: DbExecutor = db,
): Promise<CustomerNotification | null> {
  const [row] = await executor
    .update(customerNotification)
    .set({
      status: 'PENDING',
      lastError: null,
    })
    .where(
      and(
        eq(customerNotification.id, notificationId),
        eq(customerNotification.organizationId, organizationId),
        eq(customerNotification.status, 'FAILED'),
      ),
    )
    .returning();

  return row ?? null;
}
