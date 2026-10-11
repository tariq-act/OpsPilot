import { sql } from 'drizzle-orm';
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { customer } from './customer.js';
import { job } from './job.js';
import { organization } from './organization.js';

/**
 * Organization-scoped invoices for completed jobs.
 * Totals are stored as numeric(12,2) strings; the API recalculates them.
 * Soft-cancel via VOID (rows are never physically deleted).
 */

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
]);

export const invoiceItemTypeEnum = pgEnum('invoice_item_type', [
  'LABOR',
  'PARTS',
  'OTHER',
  'FEE',
]);

export const invoice = pgTable.withRLS(
  'invoice',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'restrict' }),
    invoiceNumber: text('invoice_number').notNull(),
    status: invoiceStatusEnum('status').default('DRAFT').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    tax: numeric('tax', { precision: 12, scale: 2 }).default('0.00').notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    amountDue: numeric('amount_due', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull(),
    issuedAt: timestamp('issued_at'),
    dueAt: timestamp('due_at'),
    paidAt: timestamp('paid_at'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('invoice_org_number_uidx').on(
      table.organizationId,
      table.invoiceNumber,
    ),
    // At most one non-void invoice per job.
    uniqueIndex('invoice_job_active_uidx')
      .on(table.jobId)
      .where(sql`${table.status} <> 'VOID'`),
    index('invoice_organizationId_idx').on(table.organizationId),
    index('invoice_customerId_idx').on(table.customerId),
    index('invoice_jobId_idx').on(table.jobId),
    index('invoice_status_idx').on(table.status),
    index('invoice_dueAt_idx').on(table.dueAt),
    index('invoice_createdAt_idx').on(table.createdAt),
  ],
);

export const invoiceItem = pgTable.withRLS(
  'invoice_item',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    type: invoiceItemTypeEnum('type').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index('invoice_item_invoiceId_idx').on(table.invoiceId),
    index('invoice_item_type_idx').on(table.type),
  ],
);

export type Invoice = typeof invoice.$inferSelect;
export type InvoiceItem = typeof invoiceItem.$inferSelect;
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type InvoiceItemType = (typeof invoiceItemTypeEnum.enumValues)[number];
