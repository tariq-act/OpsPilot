"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  activateAutomationRule,
  createAutomationRule,
  deactivateAutomationRule,
  getAutomationRule,
  listAutomationExecutions,
  listAutomationRules,
  updateAutomationRule,
} from "@/lib/api/automation";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  CreateAutomationRuleInput,
  ListAutomationExecutionsQuery,
  ListAutomationRulesQuery,
  UpdateAutomationRuleInput,
} from "@/lib/types";

function rulesFiltersKey(query?: ListAutomationRulesQuery) {
  return {
    triggerEvent: query?.triggerEvent,
    isActive:
      query?.isActive === undefined ? undefined : String(query.isActive),
    limit: query?.limit === undefined ? undefined : String(query.limit),
    offset: query?.offset === undefined ? undefined : String(query.offset),
  };
}

function executionsFiltersKey(query?: ListAutomationExecutionsQuery) {
  return {
    status: query?.status,
    limit: query?.limit === undefined ? undefined : String(query.limit),
    offset: query?.offset === undefined ? undefined : String(query.offset),
  };
}

async function invalidateAutomationViews(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  ruleId?: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.automation.lists(organizationId),
  });
  if (ruleId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.automation.detail(organizationId, ruleId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.automation.executions(organizationId, ruleId),
    });
  }
}

export const automationQueries = {
  list: (organizationId: string, query?: ListAutomationRulesQuery) =>
    queryOptions({
      queryKey: queryKeys.automation.list(
        organizationId,
        rulesFiltersKey(query),
      ),
      queryFn: () => listAutomationRules(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.automation.detail(organizationId, id),
      queryFn: () => getAutomationRule(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),

  executions: (
    organizationId: string,
    ruleId: string,
    query?: ListAutomationExecutionsQuery,
  ) =>
    queryOptions({
      queryKey: queryKeys.automation.executions(
        organizationId,
        ruleId,
        executionsFiltersKey(query),
      ),
      queryFn: () => listAutomationExecutions(organizationId, ruleId, query),
      enabled: Boolean(organizationId) && Boolean(ruleId),
    }),
};

export function useAutomationRulesQuery(
  organizationId: string,
  query?: ListAutomationRulesQuery,
) {
  const result = useQuery(automationQueries.list(organizationId, query));
  const state = getServerQueryState(result, (data) => data.rules.length === 0);

  return {
    ...result,
    rules: result.data?.rules ?? [],
    server: state,
  };
}

export function useAutomationRuleQuery(organizationId: string, id: string) {
  const result = useQuery(automationQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    rule: result.data?.rule ?? null,
    server: state,
  };
}

export function useAutomationExecutionsQuery(
  organizationId: string,
  ruleId: string,
  query?: ListAutomationExecutionsQuery,
) {
  const result = useQuery(
    automationQueries.executions(organizationId, ruleId, query),
  );
  const state = getServerQueryState(
    result,
    (data) => data.executions.length === 0,
  );

  return {
    ...result,
    executions: result.data?.executions ?? [],
    server: state,
  };
}

export function useCreateAutomationRuleMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateAutomationRuleInput) =>
      createAutomationRule(organizationId, body),
    onSuccess: async (data) => {
      await invalidateAutomationViews(
        queryClient,
        organizationId,
        data.rule.id,
      );
    },
  });
}

export function useUpdateAutomationRuleMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateAutomationRuleInput;
    }) => updateAutomationRule(organizationId, id, body),
    onSuccess: async (data) => {
      await invalidateAutomationViews(
        queryClient,
        organizationId,
        data.rule.id,
      );
    },
  });
}

export function useActivateAutomationRuleMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateAutomationRule(organizationId, id),
    onSuccess: async (data) => {
      await invalidateAutomationViews(
        queryClient,
        organizationId,
        data.rule.id,
      );
    },
  });
}

export function useDeactivateAutomationRuleMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateAutomationRule(organizationId, id),
    onSuccess: async (data) => {
      await invalidateAutomationViews(
        queryClient,
        organizationId,
        data.rule.id,
      );
    },
  });
}
