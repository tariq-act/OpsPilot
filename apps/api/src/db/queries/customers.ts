import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../index.js';
import {
  customer,
  type Customer,
  type CustomerStatus,
} from '../schema/customer.js';
import {
  listCustomerIdsForAssignedJobs,
  listJobIdsAssignedToTechnicianUser,
} from './job-assignments.js';

export type CreateCustomerInput = {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
};

export type UpdateCustomerInput = {
  organizationId: string;
  customerId: string;
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
};

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  const [row] = await db
    .insert(customer)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      notes: input.notes ?? null,
      status: 'ACTIVE',
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create customer');
  }
  return row;
}

export async function listCustomersForOrganization(
  organizationId: string,
): Promise<Customer[]> {
  return db
    .select()
    .from(customer)
    .where(eq(customer.organizationId, organizationId));
}

export async function listCustomersByIdsInOrganization(
  organizationId: string,
  customerIds: string[],
): Promise<Customer[]> {
  if (customerIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(customer)
    .where(
      and(
        eq(customer.organizationId, organizationId),
        inArray(customer.id, customerIds),
      ),
    );
}

export async function findCustomerInOrganization(
  organizationId: string,
  customerId: string,
): Promise<Customer | null> {
  const [row] = await db
    .select()
    .from(customer)
    .where(
      and(
        eq(customer.id, customerId),
        eq(customer.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateCustomerInOrganization(
  input: UpdateCustomerInput,
): Promise<Customer | null> {
  const patch: {
    name?: string;
    phone?: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    notes?: string | null;
  } = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.address !== undefined) patch.address = input.address;
  if (input.city !== undefined) patch.city = input.city;
  if (input.state !== undefined) patch.state = input.state;
  if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
  if (input.notes !== undefined) patch.notes = input.notes;

  const [row] = await db
    .update(customer)
    .set(patch)
    .where(
      and(
        eq(customer.id, input.customerId),
        eq(customer.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function softDeleteCustomerInOrganization(
  organizationId: string,
  customerId: string,
): Promise<Customer | null> {
  const [row] = await db
    .update(customer)
    .set({ status: 'INACTIVE' satisfies CustomerStatus })
    .where(
      and(
        eq(customer.id, customerId),
        eq(customer.organizationId, organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

/**
 * Customer IDs a technician may view via actively assigned jobs.
 */
export async function listTechnicianVisibleCustomerIds(
  organizationId: string,
  technicianUserId: string,
): Promise<string[]> {
  const jobIds = await listJobIdsAssignedToTechnicianUser(
    organizationId,
    technicianUserId,
  );
  return listCustomerIdsForAssignedJobs(organizationId, jobIds);
}
