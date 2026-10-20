"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuRefreshCw, LuSearch } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  NotificationChannelBadge,
  NotificationEventBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-badges";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, shortId } from "@/lib/format";
import { isNotificationManagerRole } from "@/lib/member-roles";
import {
  ATTENTION_NOTIFICATION_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_EVENT_TYPE_LABEL,
  NOTIFICATION_STATUSES,
  NOTIFICATION_STATUS_LABEL,
  getNotificationContent,
  getPrimaryNotificationHref,
} from "@/lib/notification-labels";
import { useCustomersQuery } from "@/lib/query/customers";
import {
  useNotificationsQuery,
  useRetryNotificationMutation,
} from "@/lib/query/notifications";
import { toUserErrorMessage } from "@/lib/query/errors";
import { cn } from "@/lib/utils";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 20;

export function NotificationList() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? ALL) as
    | NotificationStatus
    | typeof ALL;
  const eventType = (searchParams.get("eventType") ?? ALL) as
    | NotificationEventType
    | typeof ALL;
  const channel = (searchParams.get("channel") ?? ALL) as
    | NotificationChannel
    | typeof ALL;
  const customerId = searchParams.get("customerId") ?? ALL;
  const search = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [searchDraft, setSearchDraft] = useState(search);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isNotificationManagerRole(current?.role);

  const listQuery = useMemo(
    () => ({
      status: status === ALL ? undefined : status,
      eventType: eventType === ALL ? undefined : eventType,
      channel: channel === ALL ? undefined : channel,
      customerId: customerId === ALL ? undefined : customerId,
    }),
    [status, eventType, channel, customerId],
  );

  const notificationsQuery = useNotificationsQuery(organizationId, listQuery);
  const customersQuery = useCustomersQuery(organizationId);
  const retryMutation = useRetryNotificationMutation(organizationId);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.customers]);

  const needle = search.trim().toLowerCase();
  let filtered = notificationsQuery.notifications;
  if (needle) {
    filtered = filtered.filter((notification) => {
      const content = getNotificationContent(notification);
      const customerName =
        customerNameById.get(notification.customerId) ?? "";
      return (
        notification.id.toLowerCase().includes(needle) ||
        notification.recipient.toLowerCase().includes(needle) ||
        customerName.toLowerCase().includes(needle) ||
        content.title.toLowerCase().includes(needle) ||
        content.message.toLowerCase().includes(needle) ||
        NOTIFICATION_EVENT_TYPE_LABEL[notification.eventType]
          .toLowerCase()
          .includes(needle)
      );
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function updateParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
    }
    if (
      "status" in patch ||
      "eventType" in patch ||
      "channel" in patch ||
      "customerId" in patch ||
      "q" in patch
    ) {
      next.delete("page");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  async function handleRetry(id: string) {
    setActionError(null);
    setActionSuccess(null);
    setRetryingId(id);
    try {
      await retryMutation.mutateAsync(id);
      setActionSuccess("Notification queued for retry.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to retry this notification."),
      );
    } finally {
      setRetryingId(null);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Notifications" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Notifications" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can view customer notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Outbound customer notification delivery history for this organization."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void notificationsQuery.refetch()}
            disabled={notificationsQuery.server.isFetching}
          >
            <LuRefreshCw
              className={cn(
                notificationsQuery.server.isFetching && "animate-spin",
              )}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="text-sm text-foreground" aria-live="polite">
          {actionSuccess}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="notification-search">Search</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LuSearch
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="notification-search"
                  className="pl-9"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      updateParams({ q: searchDraft.trim() });
                    }
                  }}
                  placeholder="Title, recipient, or customer"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateParams({ q: searchDraft.trim() })}
              >
                Search
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                updateParams({ status: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {NOTIFICATION_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {NOTIFICATION_STATUS_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Event</Label>
            <Select
              value={eventType}
              onValueChange={(value) =>
                updateParams({ eventType: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All events</SelectItem>
                {NOTIFICATION_EVENT_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {NOTIFICATION_EVENT_TYPE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Channel</Label>
            <Select
              value={channel}
              onValueChange={(value) =>
                updateParams({ channel: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All channels</SelectItem>
                {NOTIFICATION_CHANNELS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {NOTIFICATION_CHANNEL_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select
              value={customerId}
              onValueChange={(value) =>
                updateParams({ customerId: value ?? ALL, page: "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All customers</SelectItem>
                {customersQuery.customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {notificationsQuery.attentionCount} need attention (pending,
          processing, or failed). Delivery status is not an in-app read state.
        </p>
      </div>

      {notificationsQuery.server.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : notificationsQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {notificationsQuery.server.error?.message ??
              "Unable to load notifications."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void notificationsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No notifications match these filters.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notification</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((notification) => {
                  const content = getNotificationContent(notification);
                  const href = getPrimaryNotificationHref(notification);
                  const needsAttention =
                    ATTENTION_NOTIFICATION_STATUSES.has(notification.status);
                  return (
                    <TableRow
                      key={notification.id}
                      className={cn(needsAttention && "bg-muted/30")}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/notifications/${notification.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {content.title}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {content.message}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {shortId(notification.id)} · {notification.recipient}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/customers/${notification.customerId}`}
                          className="text-sm hover:text-primary"
                        >
                          {customerNameById.get(notification.customerId) ??
                            shortId(notification.customerId)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <NotificationEventBadge
                          eventType={notification.eventType}
                        />
                      </TableCell>
                      <TableCell>
                        <NotificationChannelBadge
                          channel={notification.channel}
                        />
                      </TableCell>
                      <TableCell>
                        <NotificationStatusBadge
                          status={notification.status}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(notification.createdAt, timeZone)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={href}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Open
                          </Link>
                          {notification.status === "FAILED" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={retryingId === notification.id}
                              onClick={() =>
                                void handleRetry(notification.id)
                              }
                            >
                              {retryingId === notification.id
                                ? "Retrying…"
                                : "Retry"}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() =>
                    updateParams({ page: String(safePage - 1) })
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    updateParams({ page: String(safePage + 1) })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
