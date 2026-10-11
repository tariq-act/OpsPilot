import { and, asc, eq, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  customerFollowUp,
  type CustomerFollowUp,
  type FollowUpStatus,
  type FollowUpType,
} from '../schema/customer-follow-up.js';

export type CreateCustomerFollowUpInput = {
  id: string;
  organizationId: string;
  customerId: string;
  jobId?: string | null;
  type: FollowUpType;
  status?: FollowUpStatus;
  dueAt: Date;
  notes?: string | null;
  createdBy: string;
};

export type UpdateCustomerFollowUpInput = {
  organizationId: string;
  followUpId: string;
  status?: FollowUpStatus;
  dueAt?: Date;
  notes?: string | null;
};

export type ListFollowUpsFilter = {
  organizationId: string;
  status?: FollowUpStatus;
  type?: FollowUpType;
  customerId?: string;
  jobId?: string;
};

export async function createCustomerFollowUp(
  input: CreateCustomerFollowUpInput,
): Promise<CustomerFollowUp> {
  const [row] = await db
    .insert(customerFollowUp)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      jobId: input.jobId ?? null,
      type: input.type,
      status: input.status ?? 'PENDING',
      dueAt: input.dueAt,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create customer follow-up');
  }
  return row;
}

export async function findFollowUpInOrganization(
  organizationId: string,
  followUpId: string,
): Promise<CustomerFollowUp | null> {
  const [row] = await db
    .select()
    .from(customerFollowUp)
    .where(
      and(
        eq(customerFollowUp.id, followUpId),
        eq(customerFollowUp.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listFollowUpsForOrganization(
  filter: ListFollowUpsFilter,
): Promise<CustomerFollowUp[]> {
  const conditions: SQL[] = [
    eq(customerFollowUp.organizationId, filter.organizationId),
  ];

  if (filter.status) {
    conditions.push(eq(customerFollowUp.status, filter.status));
  }
  if (filter.type) {
    conditions.push(eq(customerFollowUp.type, filter.type));
  }
  if (filter.customerId) {
    conditions.push(eq(customerFollowUp.customerId, filter.customerId));
  }
  if (filter.jobId) {
    conditions.push(eq(customerFollowUp.jobId, filter.jobId));
  }

  return db
    .select()
    .from(customerFollowUp)
    .where(and(...conditions))
    .orderBy(asc(customerFollowUp.dueAt));
}

export async function updateFollowUpInOrganization(
  input: UpdateCustomerFollowUpInput,
): Promise<CustomerFollowUp | null> {
  const patch: {
    status?: FollowUpStatus;
    dueAt?: Date;
    notes?: string | null;
  } = {};

  if (input.status !== undefined) patch.status = input.status;
  if (input.dueAt !== undefined) patch.dueAt = input.dueAt;
  if (input.notes !== undefined) patch.notes = input.notes;

  const [row] = await db
    .update(customerFollowUp)
    .set(patch)
    .where(
      and(
        eq(customerFollowUp.id, input.followUpId),
        eq(customerFollowUp.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}
