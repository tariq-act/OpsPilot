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
  updateOrganization,
  listInvitations,
  createInvitation,
  revokeInvitation,
  updateMember,
  removeMember,
  type OrganizationSettingsInput,
  type TeamRole,
  type MemberUpdate,
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
      refetchOnWindowFocus: "always",
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

export function useUpdateOrganizationMutation(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OrganizationSettingsInput) =>
      updateOrganization(id, input),
    onSuccess: ({ organization }) => {
      client.setQueryData<OrganizationListResponse>(
        queryKeys.organizations.list(),
        (previous) =>
          previous && {
            organizations: previous.organizations.map((org) =>
              org.id === id ? { ...org, ...organization } : org,
            ),
          },
      );
      return Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.organizations.list() }),
        client.invalidateQueries({ queryKey: queryKeys.auditLogs.all(id) }),
        client.invalidateQueries({ queryKey: queryKeys.analytics.all(id) }),
      ]);
    },
  });
}

export function useInvitationsQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.invitations(id),
    queryFn: () => listInvitations(id),
    enabled: Boolean(id),
  });
}

export function useTeamMutations(id: string) {
  const client = useQueryClient();
  const refreshAudit = () =>
    client.invalidateQueries({ queryKey: queryKeys.auditLogs.all(id) });
  const refreshMembers = () =>
    Promise.all([
      client.invalidateQueries({
        queryKey: queryKeys.organizations.members(id),
      }),
      client.invalidateQueries({
        queryKey: queryKeys.organizations.invitations(id),
      }),
      refreshAudit(),
    ]);
  const refreshInvitations = () =>
    Promise.all([
      client.invalidateQueries({
        queryKey: queryKeys.organizations.invitations(id),
      }),
      refreshAudit(),
    ]);
  const invite = useMutation({
    mutationFn: (input: { email: string; role: TeamRole }) =>
      createInvitation(id, input),
    onSuccess: refreshInvitations,
    gcTime: 0,
  });
  const revoke = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(id, invitationId),
    onSuccess: refreshInvitations,
  });
  const update = useMutation({
    mutationFn: ({ memberId, ...input }: MemberUpdate & { memberId: string }) =>
      updateMember(id, memberId, input),
    onSuccess: ({ member }) => {
      client.setQueryData<MemberListResponse>(
        queryKeys.organizations.members(id),
        (previous) =>
          previous && {
            members: previous.members.map((current) =>
              current.id === member.id ? { ...current, ...member } : current,
            ),
          },
      );
      return refreshMembers();
    },
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(id, memberId),
    onSuccess: refreshMembers,
  });
  return { invite, revoke, update, remove };
}
