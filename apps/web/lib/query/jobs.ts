"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  assignTechnicians,
  cancelJob,
  completeJob,
  createJob,
  getJob,
  listJobActivities,
  listJobAssignments,
  listJobs,
  reassignTechnician,
  rescheduleJob,
  scheduleJob,
  updateJob,
  updateJobAssignment,
  updateJobProgress,
} from "@/lib/api/jobs";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  AssignTechniciansInput,
  CompleteJobInput,
  CreateJobInput,
  JobListResponse,
  JobResponse,
  ListJobsQuery,
  ReassignTechnicianInput,
  ScheduleJobInput,
  UpdateAssignmentInput,
  UpdateJobInput,
  UpdateJobProgressInput,
} from "@/lib/types";

function filtersKey(query?: ListJobsQuery) {
  return {
    status: query?.status,
    priority: query?.priority,
    customerId: query?.customerId,
    requestId: query?.requestId,
    fromDate: query?.fromDate,
    toDate: query?.toDate,
    technicianId: query?.technicianId,
  };
}

async function invalidateJobViews(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  jobId?: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.jobs.lists(organizationId),
  });
  if (jobId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.detail(organizationId, jobId),
    });
  }
}

function cacheJob(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  data: JobResponse,
) {
  queryClient.setQueryData<JobResponse>(
    queryKeys.jobs.detail(organizationId, data.job.id),
    data,
  );
}

export const jobQueries = {
  list: (organizationId: string, query?: ListJobsQuery) =>
    queryOptions({
      queryKey: queryKeys.jobs.list(organizationId, filtersKey(query)),
      queryFn: () => listJobs(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.detail(organizationId, id),
      queryFn: () => getJob(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  assignments: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.assignments(organizationId, id),
      queryFn: () => listJobAssignments(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  activities: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.activities(organizationId, id),
      queryFn: () => listJobActivities(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),
};

export function useJobsQuery(organizationId: string, query?: ListJobsQuery) {
  const result = useQuery(jobQueries.list(organizationId, query));
  const state = getServerQueryState(result, (data) => data.jobs.length === 0);

  return {
    ...result,
    jobs: result.data?.jobs ?? [],
    server: state,
  };
}

export function useJobQuery(organizationId: string, id: string) {
  const result = useQuery(jobQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    job: result.data?.job ?? null,
    server: state,
  };
}

export function useJobAssignmentsQuery(organizationId: string, id: string) {
  const result = useQuery(jobQueries.assignments(organizationId, id));
  const state = getServerQueryState(
    result,
    (data) => data.assignments.length === 0,
  );

  return {
    ...result,
    assignments: result.data?.assignments ?? [],
    server: state,
  };
}

export function useJobActivitiesQuery(organizationId: string, id: string) {
  const result = useQuery(jobQueries.activities(organizationId, id));
  const state = getServerQueryState(
    result,
    (data) => data.activities.length === 0,
  );

  return {
    ...result,
    activities: result.data?.activities ?? [],
    server: state,
  };
}

export function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.all(organizationId),
    });
}

export function useCreateJobMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJobInput) => createJob(organizationId, input),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, data);
      await invalidateJobViews(queryClient, organizationId, data.job.id);
    },
  });
}

export function useUpdateJobMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateJobInput }) =>
      updateJob(organizationId, id, body),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, data);
      await invalidateJobViews(queryClient, organizationId, data.job.id);
    },
  });
}

export function useCancelJobMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelJob(organizationId, id),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, data);
      await invalidateJobViews(queryClient, organizationId, data.job.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.assignments(organizationId, data.job.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, data.job.id),
      });
    },
  });
}

export function useScheduleJobMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
      mode,
    }: {
      id: string;
      body: ScheduleJobInput;
      mode: "schedule" | "reschedule";
    }) =>
      mode === "reschedule"
        ? rescheduleJob(organizationId, id, body)
        : scheduleJob(organizationId, id, body),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, data);
      await invalidateJobViews(queryClient, organizationId, data.job.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, data.job.id),
      });
    },
  });
}

export function useAssignTechniciansMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AssignTechniciansInput;
    }) => assignTechnicians(organizationId, id, body),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, { job: data.job });
      await invalidateJobViews(queryClient, organizationId, data.job.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.assignments(organizationId, data.job.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, data.job.id),
      });
    },
  });
}

export function useReassignTechnicianMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      assignmentId,
      body,
    }: {
      id: string;
      assignmentId: string;
      body: ReassignTechnicianInput;
    }) => reassignTechnician(organizationId, id, assignmentId, body),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, { job: data.job });
      await invalidateJobViews(queryClient, organizationId, data.job.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.assignments(organizationId, data.job.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, data.job.id),
      });
    },
  });
}

export function useUpdateJobAssignmentMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      assignmentId,
      body,
    }: {
      id: string;
      assignmentId: string;
      body: UpdateAssignmentInput;
    }) => updateJobAssignment(organizationId, id, assignmentId, body),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.assignments(organizationId, variables.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, variables.id),
      });
      await invalidateJobViews(queryClient, organizationId, variables.id);
    },
  });
}

export function useUpdateJobProgressMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateJobProgressInput;
    }) => updateJobProgress(organizationId, id, body),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, data);
      await invalidateJobViews(queryClient, organizationId, data.job.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, data.job.id),
      });
    },
  });
}

export function useCompleteJobMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CompleteJobInput }) =>
      completeJob(organizationId, id, body),
    onSuccess: async (data) => {
      cacheJob(queryClient, organizationId, data);
      await invalidateJobViews(queryClient, organizationId, data.job.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.activities(organizationId, data.job.id),
      });
    },
  });
}

export type { JobListResponse };
