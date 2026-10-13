import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { customer } from './customer.js';
import { organization } from './organization.js';

/**
 * Customer-facing outbound notifications triggered by business events.
 * Delivery is async via an in-process queue; providers are swappable.
 */

export const notificationEventTypeEnum = pgEnum('notification_event_type', [
  'JOB_SCHEDULED',
  'JOB_RESCHEDULED',
  'TECHNICIAN_ASSIGNED',
  'JOB_COMPLETED',
  'INVOICE_SENT',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REMINDER',
  'FOLLOW_UP_DUE',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'EMAIL',
  'SMS',
  'WHATSAPP',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
]);

export const customerNotification = pgTable.withRLS(
  'customer_notification',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    eventType: notificationEventTypeEnum('event_type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    status: notificationStatusEnum('status').default('PENDING').notNull(),
    recipient: text('recipient').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    /** Org-scoped idempotency key to avoid duplicate sends on event retry. */
    idempotencyKey: text('idempotency_key').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('customer_notification_org_idempotency_uidx').on(
      table.organizationId,
      table.idempotencyKey,
    ),
    index('customer_notification_organizationId_idx').on(table.organizationId),
    index('customer_notification_customerId_idx').on(table.customerId),
    index('customer_notification_status_idx').on(table.status),
    index('customer_notification_eventType_idx').on(table.eventType),
    index('customer_notification_createdAt_idx').on(table.createdAt),
  ],
);

export type CustomerNotification = typeof customerNotification.$inferSelect;
export type NotificationEventType =
  (typeof notificationEventTypeEnum.enumValues)[number];
export type NotificationChannel =
  (typeof notificationChannelEnum.enumValues)[number];
export type NotificationStatus =
  (typeof notificationStatusEnum.enumValues)[number];
