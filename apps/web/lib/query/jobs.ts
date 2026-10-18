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
  createJobNote,
  getJob,
  getJobExecution,
  getJobPhotoContent,
  listJobActivities,
  listJobAssignments,
  listJobNotes,
  listJobPhotos,
  listJobs,
  reassignTechnician,
  rescheduleJob,
  scheduleJob,
  updateJob,
  updateJobAssignment,
  updateJobProgress,
  uploadJobPhoto,
} from "@/lib/api/jobs";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  AssignTechniciansInput,
  CompleteJobInput,
  CreateJobInput,
  CreateJobNoteInput,
  JobListResponse,
  JobPhotoKind,
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

async function invalidateJobExecution(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  jobId: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.jobs.execution(organizationId, jobId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.jobs.notes(organizationId, jobId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.jobs.photos(organizationId, jobId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.jobs.activities(organizationId, jobId),
  });
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

  execution: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.execution(organizationId, id),
      queryFn: () => getJobExecution(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  notes: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.notes(organizationId, id),
      queryFn: () => listJobNotes(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  photos: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.photos(organizationId, id),
      queryFn: () => listJobPhotos(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  photoContent: (organizationId: string, id: string, photoId: string) =>
    queryOptions({
      queryKey: queryKeys.jobs.photoContent(organizationId, id, photoId),
      queryFn: () => getJobPhotoContent(organizationId, id, photoId),
      enabled:
        Boolean(organizationId) && Boolean(id) && Boolean(photoId),
      staleTime: 5 * 60 * 1000,
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

export function useJobExecutionQuery(organizationId: string, id: string) {
  const result = useQuery(jobQueries.execution(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    job: result.data?.job ?? null,
    notes: result.data?.notes ?? [],
    photos: result.data?.photos ?? [],
    activities: result.data?.activities ?? [],
    server: state,
  };
}

export function useJobNotesQuery(organizationId: string, id: string) {
  const result = useQuery(jobQueries.notes(organizationId, id));
  const state = getServerQueryState(result, (data) => data.notes.length === 0);

  return {
    ...result,
    notes: result.data?.notes ?? [],
    server: state,
  };
}

export function useJobPhotosQuery(organizationId: string, id: string) {
  const result = useQuery(jobQueries.photos(organizationId, id));
  const state = getServerQueryState(
    result,
    (data) => data.photos.length === 0,
  );

  return {
    ...result,
    photos: result.data?.photos ?? [],
    server: state,
  };
}

export function useJobPhotoContentQuery(
  organizationId: string,
  id: string,
  photoId: string,
  enabled = true,
) {
  const result = useQuery({
    ...jobQueries.photoContent(organizationId, id, photoId),
    enabled:
      enabled &&
      Boolean(organizationId) &&
      Boolean(id) &&
      Boolean(photoId),
  });

  return result;
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
      await invalidateJobExecution(queryClient, organizationId, data.job.id);
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
      await invalidateJobExecution(queryClient, organizationId, data.job.id);
    },
  });
}

export function useCreateJobNoteMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateJobNoteInput }) =>
      createJobNote(organizationId, id, body),
    onSuccess: async (_data, variables) => {
      await invalidateJobExecution(queryClient, organizationId, variables.id);
      await invalidateJobViews(queryClient, organizationId, variables.id);
    },
  });
}

export function useUploadJobPhotoMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      kind,
      file,
    }: {
      id: string;
      kind: JobPhotoKind;
      file: File;
    }) => uploadJobPhoto(organizationId, id, kind, file),
    onSuccess: async (_data, variables) => {
      await invalidateJobExecution(queryClient, organizationId, variables.id);
      await invalidateJobViews(queryClient, organizationId, variables.id);
    },
  });
}

export type { JobListResponse };
