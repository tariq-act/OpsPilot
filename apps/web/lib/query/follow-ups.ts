"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createFollowUp,
  getFollowUp,
  listFollowUps,
  updateFollowUp,
} from "@/lib/api/follow-ups";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateFollowUpInput,
  FollowUpListResponse,
  FollowUpResponse,
  ListFollowUpsQuery,
  UpdateFollowUpInput,
} from "@/lib/types";

function filtersKey(query?: ListFollowUpsQuery) {
  return {
    status: query?.status,
    type: query?.type,
    customerId: query?.customerId,
    jobId: query?.jobId,
  };
}

async function invalidateFollowUpViews(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  followUpId?: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.followUps.lists(organizationId),
  });
  if (followUpId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.followUps.detail(organizationId, followUpId),
    });
  }
}

function cacheFollowUp(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  data: FollowUpResponse,
) {
  queryClient.setQueryData<FollowUpResponse>(
    queryKeys.followUps.detail(organizationId, data.followUp.id),
    data,
  );
}

export const followUpQueries = {
  list: (organizationId: string, query?: ListFollowUpsQuery) =>
    queryOptions({
      queryKey: queryKeys.followUps.list(organizationId, filtersKey(query)),
      queryFn: () => listFollowUps(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.followUps.detail(organizationId, id),
      queryFn: () => getFollowUp(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),
};

export function useFollowUpsQuery(
  organizationId: string,
  query?: ListFollowUpsQuery,
) {
  const result = useQuery(followUpQueries.list(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.followUps.length === 0,
  );

  return {
    ...result,
    followUps: result.data?.followUps ?? [],
    server: state,
  };
}

export function useFollowUpQuery(organizationId: string, id: string) {
  const result = useQuery(followUpQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    followUp: result.data?.followUp ?? null,
    server: state,
  };
}

export function useInvalidateFollowUps() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.followUps.all(organizationId),
    });
}

export function useCreateFollowUpMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateFollowUpInput) =>
      createFollowUp(organizationId, body),
    onSuccess: async (data) => {
      cacheFollowUp(queryClient, organizationId, data);
      await invalidateFollowUpViews(
        queryClient,
        organizationId,
        data.followUp.id,
      );
    },
  });
}

export function useUpdateFollowUpMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFollowUpInput }) =>
      updateFollowUp(organizationId, id, body),
    onSuccess: async (data) => {
      cacheFollowUp(queryClient, organizationId, data);
      await invalidateFollowUpViews(
        queryClient,
        organizationId,
        data.followUp.id,
      );
    },
  });
}

export type { FollowUpListResponse };
