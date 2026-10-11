import { and, asc, desc, eq, inArray, ne, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  invoice,
  invoiceItem,
  type Invoice,
  type InvoiceItem,
  type InvoiceItemType,
  type InvoiceStatus,
} from '../schema/invoice.js';
import { organization } from '../schema/organization.js';

export type DbExecutor = Pick<
  typeof db,
  'insert' | 'update' | 'select' | 'delete'
>;

export type CreateInvoiceInput = {
  id: string;
  organizationId: string;
  customerId: string;
  jobId: string;
  invoiceNumber: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  currency: string;
  dueAt?: Date | null;
  createdBy: string;
};

export type CreateInvoiceItemInput = {
  id: string;
  invoiceId: string;
  type: InvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type UpdateInvoiceTotalsInput = {
  organizationId: string;
  invoiceId: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  dueAt?: Date | null;
};

export type UpdateInvoiceStatusInput = {
  organizationId: string;
  invoiceId: string;
  status: InvoiceStatus;
  issuedAt?: Date | null;
  paidAt?: Date | null;
};

export type ListInvoicesFilter = {
  organizationId: string;
  status?: InvoiceStatus;
  /** Prefer over `status` when matching multiple statuses. */
  statuses?: InvoiceStatus[];
  customerId?: string;
  jobId?: string;
  ids?: string[];
};

export async function findOrganizationCurrency(
  organizationId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ currency: organization.currency })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row?.currency ?? null;
}

export async function createInvoice(
  input: CreateInvoiceInput,
  executor: DbExecutor = db,
): Promise<Invoice> {
  const [row] = await executor
    .insert(invoice)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      jobId: input.jobId,
      invoiceNumber: input.invoiceNumber,
      status: 'DRAFT',
      subtotal: input.subtotal,
      discount: input.discount,
      tax: input.tax,
      total: input.total,
      amountPaid: input.amountPaid,
      amountDue: input.amountDue,
      currency: input.currency,
      dueAt: input.dueAt ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create invoice');
  }
  return row;
}

export async function createInvoiceItems(
  items: CreateInvoiceItemInput[],
  executor: DbExecutor = db,
): Promise<InvoiceItem[]> {
  if (items.length === 0) {
    return [];
  }

  const rows = await executor
    .insert(invoiceItem)
    .values(
      items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    )
    .returning();

  return rows;
}

export async function deleteInvoiceItemsForInvoice(
  invoiceId: string,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.delete(invoiceItem).where(eq(invoiceItem.invoiceId, invoiceId));
}

export async function listInvoicesForOrganization(
  filter: ListInvoicesFilter,
): Promise<Invoice[]> {
  const conditions: SQL[] = [
    eq(invoice.organizationId, filter.organizationId),
  ];

  if (filter.statuses !== undefined) {
    if (filter.statuses.length === 0) {
      return [];
    }
    conditions.push(inArray(invoice.status, filter.statuses));
  } else if (filter.status) {
    conditions.push(eq(invoice.status, filter.status));
  }
  if (filter.customerId) {
    conditions.push(eq(invoice.customerId, filter.customerId));
  }
  if (filter.jobId) {
    conditions.push(eq(invoice.jobId, filter.jobId));
  }
  if (filter.ids !== undefined) {
    if (filter.ids.length === 0) {
      return [];
    }
    conditions.push(inArray(invoice.id, filter.ids));
  }

  return db
    .select()
    .from(invoice)
    .where(and(...conditions))
    .orderBy(desc(invoice.createdAt));
}

export async function findInvoiceInOrganization(
  organizationId: string,
  invoiceId: string,
  executor: DbExecutor = db,
): Promise<Invoice | null> {
  const [row] = await executor
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.id, invoiceId),
        eq(invoice.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findActiveInvoiceForJob(
  organizationId: string,
  jobId: string,
  executor: DbExecutor = db,
): Promise<Invoice | null> {
  const [row] = await executor
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.organizationId, organizationId),
        eq(invoice.jobId, jobId),
        ne(invoice.status, 'VOID'),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listItemsForInvoice(
  invoiceId: string,
  executor: DbExecutor = db,
): Promise<InvoiceItem[]> {
  return executor
    .select()
    .from(invoiceItem)
    .where(eq(invoiceItem.invoiceId, invoiceId))
    .orderBy(asc(invoiceItem.description));
}

export async function listItemsForInvoices(
  invoiceIds: string[],
): Promise<InvoiceItem[]> {
  if (invoiceIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(invoiceItem)
    .where(inArray(invoiceItem.invoiceId, invoiceIds))
    .orderBy(asc(invoiceItem.description));
}

export async function updateInvoiceTotalsInOrganization(
  input: UpdateInvoiceTotalsInput,
  executor: DbExecutor = db,
): Promise<Invoice | null> {
  const patch: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    amountPaid: string;
    amountDue: string;
    dueAt?: Date | null;
  } = {
    subtotal: input.subtotal,
    discount: input.discount,
    tax: input.tax,
    total: input.total,
    amountPaid: input.amountPaid,
    amountDue: input.amountDue,
  };

  if (input.dueAt !== undefined) {
    patch.dueAt = input.dueAt;
  }

  const [row] = await executor
    .update(invoice)
    .set(patch)
    .where(
      and(
        eq(invoice.id, input.invoiceId),
        eq(invoice.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function updateInvoiceStatusInOrganization(
  input: UpdateInvoiceStatusInput,
  executor: DbExecutor = db,
): Promise<Invoice | null> {
  const patch: {
    status: InvoiceStatus;
    issuedAt?: Date | null;
    paidAt?: Date | null;
  } = {
    status: input.status,
  };

  if (input.issuedAt !== undefined) {
    patch.issuedAt = input.issuedAt;
  }
  if (input.paidAt !== undefined) {
    patch.paidAt = input.paidAt;
  }

  const [row] = await executor
    .update(invoice)
    .set(patch)
    .where(
      and(
        eq(invoice.id, input.invoiceId),
        eq(invoice.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

/**
 * Next invoice number for the org (INV-000001 style).
 * Caller must hold a transaction that also inserts the new invoice.
 */
export async function nextInvoiceNumber(
  organizationId: string,
  executor: DbExecutor = db,
): Promise<string> {
  const rows = await executor
    .select({ invoiceNumber: invoice.invoiceNumber })
    .from(invoice)
    .where(eq(invoice.organizationId, organizationId));

  let maxSeq = 0;
  for (const row of rows) {
    const match = /^INV-(\d+)$/.exec(row.invoiceNumber);
    if (!match) continue;
    const seq = Number.parseInt(match[1]!, 10);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `INV-${String(maxSeq + 1).padStart(6, '0')}`;
}
