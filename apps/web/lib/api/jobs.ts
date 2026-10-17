/**
 * Typed API resource functions — jobs.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  AssignTechniciansInput,
  AssignTechniciansResponse,
  CompleteJobInput,
  CreateJobInput,
  JobActivityListResponse,
  JobAssignmentListResponse,
  JobAssignmentResponse,
  JobListResponse,
  JobResponse,
  ListJobsQuery,
  ReassignTechnicianInput,
  ReassignTechnicianResponse,
  ScheduleJobInput,
  UpdateAssignmentInput,
  UpdateJobInput,
  UpdateJobProgressInput,
} from "@/lib/types";

function toQueryString(query?: ListJobsQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.requestId) params.set("requestId", query.requestId);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.technicianId) params.set("technicianId", query.technicianId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listJobs(
  organizationId: string,
  query?: ListJobsQuery,
): Promise<JobListResponse> {
  return api.get<JobListResponse>(`/jobs${toQueryString(query)}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function getJob(
  organizationId: string,
  id: string,
): Promise<JobResponse> {
  return api.get<JobResponse>(`/jobs/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createJob(
  organizationId: string,
  body: CreateJobInput,
): Promise<JobResponse> {
  return api.post<JobResponse>("/jobs", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateJob(
  organizationId: string,
  id: string,
  body: UpdateJobInput,
): Promise<JobResponse> {
  return api.patch<JobResponse>(`/jobs/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}

/** Soft cancel: sets status to CANCELLED. */
export function cancelJob(
  organizationId: string,
  id: string,
): Promise<JobResponse> {
  return api.delete<JobResponse>(`/jobs/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function scheduleJob(
  organizationId: string,
  id: string,
  body: ScheduleJobInput,
): Promise<JobResponse> {
  return api.post<JobResponse>(`/jobs/${id}/schedule`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function rescheduleJob(
  organizationId: string,
  id: string,
  body: ScheduleJobInput,
): Promise<JobResponse> {
  return api.put<JobResponse>(`/jobs/${id}/schedule`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function listJobAssignments(
  organizationId: string,
  id: string,
): Promise<JobAssignmentListResponse> {
  return api.get<JobAssignmentListResponse>(`/jobs/${id}/assignments`, {
    headers: organizationHeaders(organizationId),
  });
}

export function assignTechnicians(
  organizationId: string,
  id: string,
  body: AssignTechniciansInput,
): Promise<AssignTechniciansResponse> {
  return api.post<AssignTechniciansResponse>(`/jobs/${id}/assignments`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function reassignTechnician(
  organizationId: string,
  id: string,
  assignmentId: string,
  body: ReassignTechnicianInput,
): Promise<ReassignTechnicianResponse> {
  return api.post<ReassignTechnicianResponse>(
    `/jobs/${id}/assignments/${assignmentId}/reassign`,
    body,
    { headers: organizationHeaders(organizationId) },
  );
}

export function updateJobAssignment(
  organizationId: string,
  id: string,
  assignmentId: string,
  body: UpdateAssignmentInput,
): Promise<JobAssignmentResponse> {
  return api.patch<JobAssignmentResponse>(
    `/jobs/${id}/assignments/${assignmentId}`,
    body,
    { headers: organizationHeaders(organizationId) },
  );
}

export function updateJobProgress(
  organizationId: string,
  id: string,
  body: UpdateJobProgressInput,
): Promise<JobResponse> {
  return api.post<JobResponse>(`/jobs/${id}/progress`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function completeJob(
  organizationId: string,
  id: string,
  body: CompleteJobInput,
): Promise<JobResponse> {
  return api.post<JobResponse>(`/jobs/${id}/complete`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function listJobActivities(
  organizationId: string,
  id: string,
): Promise<JobActivityListResponse> {
  return api.get<JobActivityListResponse>(`/jobs/${id}/activity`, {
    headers: organizationHeaders(organizationId),
  });
}
