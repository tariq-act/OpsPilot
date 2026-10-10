import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  technician,
  type Technician,
  type TechnicianStatus,
} from '../schema/technician.js';

export type CreateTechnicianInput = {
  id: string;
  organizationId: string;
  userId: string;
  employeeCode: string;
  phone?: string | null;
  bio?: string | null;
  status?: TechnicianStatus;
  hireDate?: Date | null;
};

export type UpdateTechnicianInput = {
  organizationId: string;
  technicianId: string;
  employeeCode?: string;
  phone?: string | null;
  bio?: string | null;
  status?: TechnicianStatus;
  hireDate?: Date | null;
};

export type ListTechniciansFilter = {
  organizationId: string;
  status?: TechnicianStatus;
  userId?: string;
};

export async function createTechnician(
  input: CreateTechnicianInput,
): Promise<Technician> {
  const [row] = await db
    .insert(technician)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      userId: input.userId,
      employeeCode: input.employeeCode,
      phone: input.phone ?? null,
      bio: input.bio ?? null,
      status: input.status ?? 'ACTIVE',
      hireDate: input.hireDate ?? null,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create technician');
  }
  return row;
}

export async function listTechniciansForOrganization(
  filter: ListTechniciansFilter,
): Promise<Technician[]> {
  const conditions: SQL[] = [
    eq(technician.organizationId, filter.organizationId),
  ];

  if (filter.status) {
    conditions.push(eq(technician.status, filter.status));
  }
  if (filter.userId) {
    conditions.push(eq(technician.userId, filter.userId));
  }

  return db
    .select()
    .from(technician)
    .where(and(...conditions));
}

export async function findTechnicianInOrganization(
  organizationId: string,
  technicianId: string,
): Promise<Technician | null> {
  const [row] = await db
    .select()
    .from(technician)
    .where(
      and(
        eq(technician.id, technicianId),
        eq(technician.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findTechnicianByUserInOrganization(
  organizationId: string,
  userId: string,
): Promise<Technician | null> {
  const [row] = await db
    .select()
    .from(technician)
    .where(
      and(
        eq(technician.organizationId, organizationId),
        eq(technician.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findTechnicianByEmployeeCodeInOrganization(
  organizationId: string,
  employeeCode: string,
): Promise<Technician | null> {
  const [row] = await db
    .select()
    .from(technician)
    .where(
      and(
        eq(technician.organizationId, organizationId),
        eq(technician.employeeCode, employeeCode),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateTechnicianInOrganization(
  input: UpdateTechnicianInput,
): Promise<Technician | null> {
  const patch: {
    employeeCode?: string;
    phone?: string | null;
    bio?: string | null;
    status?: TechnicianStatus;
    hireDate?: Date | null;
  } = {};

  if (input.employeeCode !== undefined) patch.employeeCode = input.employeeCode;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.status !== undefined) patch.status = input.status;
  if (input.hireDate !== undefined) patch.hireDate = input.hireDate;

  const [row] = await db
    .update(technician)
    .set(patch)
    .where(
      and(
        eq(technician.id, input.technicianId),
        eq(technician.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

/** Soft deactivate: set status to INACTIVE. */
export async function softDeleteTechnicianInOrganization(
  organizationId: string,
  technicianId: string,
): Promise<Technician | null> {
  const [row] = await db
    .update(technician)
    .set({ status: 'INACTIVE' satisfies TechnicianStatus })
    .where(
      and(
        eq(technician.id, technicianId),
        eq(technician.organizationId, organizationId),
      ),
    )
    .returning();

  return row ?? null;
}
