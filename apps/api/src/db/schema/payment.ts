import { sql } from 'drizzle-orm';
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { customer } from './customer.js';
import { invoice } from './invoice.js';
import { organization } from './organization.js';

/**
 * Organization-scoped payments against invoices.
 * SUCCEEDED rows count toward invoice amountPaid; REFUNDED preserves history.
 * ONLINE success is never accepted from the client alone (no gateway yet).
 */

export const paymentMethodEnum = pgEnum('payment_method', [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'UPI',
  'ONLINE',
  'OTHER',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
]);

export const payment = pgTable.withRLS(
  'payment',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull(),
    method: paymentMethodEnum('method').notNull(),
    status: paymentStatusEnum('status').notNull(),
    transactionId: text('transaction_id'),
    paidAt: timestamp('paid_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Idempotency for provider / external references within an org.
    uniqueIndex('payment_org_transaction_uidx')
      .on(table.organizationId, table.transactionId)
      .where(sql`${table.transactionId} IS NOT NULL`),
    index('payment_organizationId_idx').on(table.organizationId),
    index('payment_customerId_idx').on(table.customerId),
    index('payment_invoiceId_idx').on(table.invoiceId),
    index('payment_status_idx').on(table.status),
    index('payment_paidAt_idx').on(table.paidAt),
    index('payment_createdAt_idx').on(table.createdAt),
  ],
);

export type Payment = typeof payment.$inferSelect;
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
