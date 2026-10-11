import { and, asc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import {
  payment,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from '../schema/payment.js';

export type DbExecutor = Pick<typeof db, 'insert' | 'update' | 'select' | 'delete'>;

export type CreatePaymentInput = {
  id: string;
  organizationId: string;
  customerId: string;
  invoiceId: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  paidAt?: Date | null;
};

export async function createPayment(
  input: CreatePaymentInput,
  executor: DbExecutor = db,
): Promise<Payment> {
  const [row] = await executor
    .insert(payment)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      status: input.status,
      transactionId: input.transactionId ?? null,
      paidAt: input.paidAt ?? null,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create payment');
  }
  return row;
}

export async function findPaymentInOrganization(
  organizationId: string,
  paymentId: string,
  executor: DbExecutor = db,
): Promise<Payment | null> {
  const [row] = await executor
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.id, paymentId),
        eq(payment.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findPaymentByTransactionId(
  organizationId: string,
  transactionId: string,
  executor: DbExecutor = db,
): Promise<Payment | null> {
  const [row] = await executor
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.organizationId, organizationId),
        eq(payment.transactionId, transactionId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listPaymentsForInvoice(
  organizationId: string,
  invoiceId: string,
): Promise<Payment[]> {
  return db
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.organizationId, organizationId),
        eq(payment.invoiceId, invoiceId),
      ),
    )
    .orderBy(asc(payment.createdAt));
}

export async function listSucceededPaymentsForInvoice(
  organizationId: string,
  invoiceId: string,
  executor: DbExecutor = db,
): Promise<Payment[]> {
  return executor
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.organizationId, organizationId),
        eq(payment.invoiceId, invoiceId),
        eq(payment.status, 'SUCCEEDED'),
      ),
    )
    .orderBy(asc(payment.createdAt));
}

export async function updatePaymentStatusInOrganization(
  input: {
    organizationId: string;
    paymentId: string;
    status: PaymentStatus;
  },
  executor: DbExecutor = db,
): Promise<Payment | null> {
  const [row] = await executor
    .update(payment)
    .set({ status: input.status })
    .where(
      and(
        eq(payment.id, input.paymentId),
        eq(payment.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}
