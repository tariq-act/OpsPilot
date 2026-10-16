"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createOrganization,
  listMembers,
  listOrganizations,
  type CreateOrganizationInput,
} from "@/lib/api/organizations";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateOrganizationResponse,
  MemberListResponse,
  OrganizationListItem,
  OrganizationListResponse,
} from "@/lib/types";

export const organizationQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.organizations.list(),
      queryFn: listOrganizations,
    }),

  members: (organizationId: string) =>
    queryOptions({
      queryKey: queryKeys.organizations.members(organizationId),
      queryFn: () => listMembers(organizationId),
      enabled: Boolean(organizationId),
    }),
};

export function useOrganizationsQuery() {
  const query = useQuery(organizationQueries.list());
  const state = getServerQueryState(
    query,
    (data) => data.organizations.length === 0,
  );

  return {
    ...query,
    organizations: query.data?.organizations ?? [],
    server: state,
  };
}

export function useOrganizationMembersQuery(organizationId: string) {
  const query = useQuery(organizationQueries.members(organizationId));
  const state = getServerQueryState(query, (data) => data.members.length === 0);

  return {
    ...query,
    members: query.data?.members ?? [],
    server: state,
  };
}

/**
 * Creates an organization, optimistically inserts it into the list cache,
 * then invalidates the organization list so the server remains the source of truth.
 */
export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => createOrganization(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.organizations.lists(),
      });

      const previous = queryClient.getQueryData<OrganizationListResponse>(
        queryKeys.organizations.list(),
      );

      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const optimisticOrg: OrganizationListItem = {
        id: optimisticId,
        name: input.name,
        slug: input.slug,
        logo: null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        timezone: input.timezone,
        currency: input.currency,
        createdAt: now,
        updatedAt: now,
        role: "OWNER",
        membershipStatus: "ACTIVE",
        membershipId: `optimistic-membership-${optimisticId}`,
      };

      queryClient.setQueryData<OrganizationListResponse>(
        queryKeys.organizations.list(),
        {
          organizations: [optimisticOrg, ...(previous?.organizations ?? [])],
        },
      );

      return { previous, optimisticId };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.organizations.list(),
          context.previous,
        );
      }
    },
    onSuccess: (data: CreateOrganizationResponse, _input, context) => {
      queryClient.setQueryData<OrganizationListResponse>(
        queryKeys.organizations.list(),
        (current) => {
          const withoutOptimistic = (current?.organizations ?? []).filter(
            (org) => org.id !== context?.optimisticId,
          );
          const created: OrganizationListItem = {
            ...data.organization,
            role: data.membership.role,
            membershipStatus: data.membership.status,
            membershipId: data.membership.id,
          };
          return {
            organizations: [
              created,
              ...withoutOptimistic.filter((org) => org.id !== created.id),
            ],
          };
        },
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.lists(),
      });
    },
  });
}

export type { MemberListResponse, OrganizationListResponse };
