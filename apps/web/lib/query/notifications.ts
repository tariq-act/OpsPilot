"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getNotification,
  listNotifications,
  retryNotification,
} from "@/lib/api/notifications";
import { ATTENTION_NOTIFICATION_STATUSES } from "@/lib/notification-labels";
import { queryKeys } from "@/lib/query/keys";
import { getServerQueryState } from "@/lib/query/query-state";
import type {
  ListNotificationsQuery,
  NotificationListResponse,
  NotificationResponse,
} from "@/lib/types";

function filtersKey(query?: ListNotificationsQuery) {
  return {
    status: query?.status,
    eventType: query?.eventType,
    channel: query?.channel,
    customerId: query?.customerId,
  };
}

async function invalidateNotificationViews(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  notificationId?: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.lists(organizationId),
  });
  if (notificationId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.detail(organizationId, notificationId),
    });
  }
}

function cacheNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  data: NotificationResponse,
) {
  queryClient.setQueryData<NotificationResponse>(
    queryKeys.notifications.detail(organizationId, data.notification.id),
    data,
  );
}

export const notificationQueries = {
  list: (organizationId: string, query?: ListNotificationsQuery) =>
    queryOptions({
      queryKey: queryKeys.notifications.list(
        organizationId,
        filtersKey(query),
      ),
      queryFn: () => listNotifications(organizationId, query),
      enabled: Boolean(organizationId),
    }),

  detail: (organizationId: string, id: string) =>
    queryOptions({
      queryKey: queryKeys.notifications.detail(organizationId, id),
      queryFn: () => getNotification(organizationId, id),
      enabled: Boolean(organizationId) && Boolean(id),
    }),
};

export function useNotificationsQuery(
  organizationId: string,
  query?: ListNotificationsQuery,
) {
  const result = useQuery(notificationQueries.list(organizationId, query));
  const state = getServerQueryState(
    result,
    (data) => data.notifications.length === 0,
  );
  const attentionCount = (result.data?.notifications ?? []).filter(
    (notification) =>
      ATTENTION_NOTIFICATION_STATUSES.has(notification.status),
  ).length;

  return {
    ...result,
    notifications: result.data?.notifications ?? [],
    attentionCount,
    server: state,
  };
}

export function useNotificationQuery(organizationId: string, id: string) {
  const result = useQuery(notificationQueries.detail(organizationId, id));
  const state = getServerQueryState(result);

  return {
    ...result,
    notification: result.data?.notification ?? null,
    server: state,
  };
}

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all(organizationId),
    });
}

export function useRetryNotificationMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retryNotification(organizationId, id),
    onSuccess: async (data) => {
      cacheNotification(queryClient, organizationId, data);
      await invalidateNotificationViews(
        queryClient,
        organizationId,
        data.notification.id,
      );
    },
  });
}

export type { NotificationListResponse };
