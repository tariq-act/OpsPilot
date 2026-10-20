/**
 * Typed API resource functions — outbound customer notifications.
 * Organization scope is the `x-organization-id` header, never the body.
 */

import { api } from "@/lib/api";
import { organizationHeaders } from "@/lib/api/org-headers";
import type {
  ListNotificationsQuery,
  NotificationListResponse,
  NotificationResponse,
} from "@/lib/types";

function toQueryString(query?: ListNotificationsQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.eventType) params.set("eventType", query.eventType);
  if (query.channel) params.set("channel", query.channel);
  if (query.customerId) params.set("customerId", query.customerId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function listNotifications(
  organizationId: string,
  query?: ListNotificationsQuery,
): Promise<NotificationListResponse> {
  return api.get<NotificationListResponse>(
    `/notifications${toQueryString(query)}`,
    { headers: organizationHeaders(organizationId) },
  );
}

export function getNotification(
  organizationId: string,
  id: string,
): Promise<NotificationResponse> {
  return api.get<NotificationResponse>(`/notifications/${id}`, {
    headers: organizationHeaders(organizationId),
  });
}

export function retryNotification(
  organizationId: string,
  id: string,
): Promise<NotificationResponse> {
  return api.post<NotificationResponse>(
    `/notifications/${id}/retry`,
    undefined,
    { headers: organizationHeaders(organizationId) },
  );
}
