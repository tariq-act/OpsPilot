"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  NotificationChannelBadge,
  NotificationEventBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-badges";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateTime, shortId } from "@/lib/format";
import { isNotificationManagerRole } from "@/lib/member-roles";
import {
  canRetryNotification,
  getNotificationContent,
  getNotificationEntityLinks,
  getPrimaryNotificationHref,
} from "@/lib/notification-labels";
import { useCustomerQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useNotificationQuery,
  useRetryNotificationMutation,
} from "@/lib/query/notifications";
import { cn } from "@/lib/utils";

export function NotificationDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isNotificationManagerRole(current?.role);

  const detailQuery = useNotificationQuery(organizationId, id);
  const notification = detailQuery.notification;
  const customerQuery = useCustomerQuery(
    organizationId,
    notification?.customerId ?? "",
  );
  const retryMutation = useRetryNotificationMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function handleRetry() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await retryMutation.mutateAsync(id);
      setActionSuccess("Notification queued for retry.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to retry this notification."),
      );
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Notification" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Notification" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can view customer notifications.
        </p>
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Notification" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.server.isError || !notification) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/notifications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to notifications
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {detailQuery.server.error?.message ?? "Notification not found."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void detailQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const content = getNotificationContent(notification);
  const entityLinks = getNotificationEntityLinks(notification);
  const primaryHref = getPrimaryNotificationHref(notification);
  const customer = customerQuery.customer;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/notifications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to notifications
        </Link>
        <PageHeader
          title={content.title}
          description={`Notification ${shortId(notification.id)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href={primaryHref}
                className={buttonVariants({ variant: "outline" })}
              >
                Open related
              </Link>
              {canRetryNotification(notification.status) ? (
                <Button
                  type="button"
                  disabled={retryMutation.isPending}
                  onClick={() => void handleRetry()}
                >
                  {retryMutation.isPending ? "Retrying…" : "Retry delivery"}
                </Button>
              ) : null}
            </div>
          }
        />
      </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <NotificationStatusBadge status={notification.status} />
            <NotificationEventBadge eventType={notification.eventType} />
            <NotificationChannelBadge channel={notification.channel} />
          </div>
          <p className="mt-4 text-sm text-foreground">{content.message}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Recipient">{notification.recipient}</Field>
            <Field label="Attempts">{notification.attemptCount}</Field>
            <Field label="Created">
              {formatDateTime(notification.createdAt, timeZone)}
            </Field>
            <Field label="Sent">
              {formatDateTime(notification.sentAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(notification.updatedAt, timeZone)}
            </Field>
            <Field label="Idempotency key">
              <span className="break-all font-mono text-xs">
                {notification.idempotencyKey}
              </span>
            </Field>
          </dl>
          {notification.lastError ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Last error
              </p>
              <p className="mt-1 text-sm text-destructive">
                {notification.lastError}
              </p>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            {customerQuery.server.isLoading ? (
              <div className="mt-4 h-12 animate-pulse rounded-md bg-muted" />
            ) : customer ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  {customer.name}
                </p>
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Open customer
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {shortId(notification.customerId)}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Related entities
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {entityLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "w-full justify-start",
                    })}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
