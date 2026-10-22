/**
 * Typed API resource functions — automation rules and executions.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  AutomationExecutionListResponse,
  AutomationRuleListResponse,
  AutomationRuleResponse,
  CreateAutomationRuleInput,
  ListAutomationExecutionsQuery,
  ListAutomationRulesQuery,
  UpdateAutomationRuleInput,
} from "@/lib/types";

function toRulesQueryString(query?: ListAutomationRulesQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.triggerEvent) params.set("triggerEvent", query.triggerEvent);
  if (query.isActive !== undefined) {
    params.set("isActive", String(query.isActive));
  }
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function toExecutionsQueryString(
  query?: ListAutomationExecutionsQuery,
): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listAutomationRules(
  organizationId: string,
  query?: ListAutomationRulesQuery,
): Promise<AutomationRuleListResponse> {
  return api.get<AutomationRuleListResponse>(
    `/automation/rules${toRulesQueryString(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getAutomationRule(
  organizationId: string,
  id: string,
): Promise<AutomationRuleResponse> {
  return api.get<AutomationRuleResponse>(`/automation/rules/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function createAutomationRule(
  organizationId: string,
  body: CreateAutomationRuleInput,
): Promise<AutomationRuleResponse> {
  return api.post<AutomationRuleResponse>("/automation/rules", body, {
    headers: organizationHeaders(organizationId),
  });
}

export function updateAutomationRule(
  organizationId: string,
  id: string,
  body: UpdateAutomationRuleInput,
): Promise<AutomationRuleResponse> {
  return api.patch<AutomationRuleResponse>(`/automation/rules/${id}`, body, {
    headers: organizationHeaders(organizationId),
  });
}

export function activateAutomationRule(
  organizationId: string,
  id: string,
): Promise<AutomationRuleResponse> {
  return api.post<AutomationRuleResponse>(
    `/automation/rules/${id}/activate`,
    undefined,
    { headers: organizationHeaders(organizationId) },
  );
}

export function deactivateAutomationRule(
  organizationId: string,
  id: string,
): Promise<AutomationRuleResponse> {
  return api.post<AutomationRuleResponse>(
    `/automation/rules/${id}/deactivate`,
    undefined,
    { headers: organizationHeaders(organizationId) },
  );
}

export function listAutomationExecutions(
  organizationId: string,
  ruleId: string,
  query?: ListAutomationExecutionsQuery,
): Promise<AutomationExecutionListResponse> {
  return api.get<AutomationExecutionListResponse>(
    `/automation/rules/${ruleId}/executions${toExecutionsQueryString(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}
