import { and, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { db } from '../index.js';
import {
  serviceRequest,
  type ServiceRequest,
  type ServiceRequestPriority,
  type ServiceRequestSource,
  type ServiceRequestStatus,
} from '../schema/service-request.js';
import {
  listJobIdsAssignedToTechnicianUser,
  listRequestIdsForAssignedJobs,
} from './job-assignments.js';

export type CreateServiceRequestInput = {
  id: string;
  organizationId: string;
  customerId: string;
  title: string;
  description?: string | null;
  priority: ServiceRequestPriority;
  source: ServiceRequestSource;
  preferredDate?: Date | null;
  preferredTime?: string | null;
  createdBy: string;
};

export type UpdateServiceRequestInput = {
  organizationId: string;
  serviceRequestId: string;
  title?: string;
  description?: string | null;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  source?: ServiceRequestSource;
  preferredDate?: Date | null;
  preferredTime?: string | null;
};

export type ListServiceRequestsFilter = {
  organizationId: string;
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
  customerId?: string;
  fromDate?: Date;
  toDate?: Date;
  ids?: string[];
};

export async function createServiceRequest(
  input: CreateServiceRequestInput,
): Promise<ServiceRequest> {
  const [row] = await db
    .insert(serviceRequest)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      status: 'NEW',
      source: input.source,
      preferredDate: input.preferredDate ?? null,
      preferredTime: input.preferredTime ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create service request');
  }
  return row;
}

export async function listServiceRequestsForOrganization(
  filter: ListServiceRequestsFilter,
): Promise<ServiceRequest[]> {
  const conditions: SQL[] = [
    eq(serviceRequest.organizationId, filter.organizationId),
  ];

  if (filter.status) {
    conditions.push(eq(serviceRequest.status, filter.status));
  }
  if (filter.priority) {
    conditions.push(eq(serviceRequest.priority, filter.priority));
  }
  if (filter.customerId) {
    conditions.push(eq(serviceRequest.customerId, filter.customerId));
  }
  if (filter.fromDate) {
    conditions.push(gte(serviceRequest.createdAt, filter.fromDate));
  }
  if (filter.toDate) {
    conditions.push(lte(serviceRequest.createdAt, filter.toDate));
  }
  if (filter.ids !== undefined) {
    if (filter.ids.length === 0) {
      return [];
    }
    conditions.push(inArray(serviceRequest.id, filter.ids));
  }

  return db
    .select()
    .from(serviceRequest)
    .where(and(...conditions));
}

export async function findServiceRequestInOrganization(
  organizationId: string,
  serviceRequestId: string,
): Promise<ServiceRequest | null> {
  const [row] = await db
    .select()
    .from(serviceRequest)
    .where(
      and(
        eq(serviceRequest.id, serviceRequestId),
        eq(serviceRequest.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateServiceRequestInOrganization(
  input: UpdateServiceRequestInput,
): Promise<ServiceRequest | null> {
  const patch: {
    title?: string;
    description?: string | null;
    priority?: ServiceRequestPriority;
    status?: ServiceRequestStatus;
    source?: ServiceRequestSource;
    preferredDate?: Date | null;
    preferredTime?: string | null;
  } = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.source !== undefined) patch.source = input.source;
  if (input.preferredDate !== undefined) {
    patch.preferredDate = input.preferredDate;
  }
  if (input.preferredTime !== undefined) {
    patch.preferredTime = input.preferredTime;
  }

  const [row] = await db
    .update(serviceRequest)
    .set(patch)
    .where(
      and(
        eq(serviceRequest.id, input.serviceRequestId),
        eq(serviceRequest.organizationId, input.organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

/**
 * Soft cancel: set status to CANCELLED. Does not delete the row.
 */
export async function cancelServiceRequestInOrganization(
  organizationId: string,
  serviceRequestId: string,
): Promise<ServiceRequest | null> {
  const [row] = await db
    .update(serviceRequest)
    .set({ status: 'CANCELLED' })
    .where(
      and(
        eq(serviceRequest.id, serviceRequestId),
        eq(serviceRequest.organizationId, organizationId),
      ),
    )
    .returning();

  return row ?? null;
}

/**
 * Service request IDs a technician may view via actively assigned jobs.
 */
export async function listTechnicianVisibleServiceRequestIds(
  organizationId: string,
  technicianUserId: string,
): Promise<string[]> {
  const jobIds = await listJobIdsAssignedToTechnicianUser(
    organizationId,
    technicianUserId,
  );
  return listRequestIdsForAssignedJobs(organizationId, jobIds);
}
