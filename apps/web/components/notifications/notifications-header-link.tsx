"use client";

import Link from "next/link";
import { LuBell } from "react-icons/lu";

import { useOrg } from "@/components/providers/org-provider";
import { isNotificationManagerRole } from "@/lib/member-roles";
import { useNotificationsQuery } from "@/lib/query/notifications";
import { cn } from "@/lib/utils";

/** Compact attention badge for the dashboard shell (delivery, not read/unread). */
export function NotificationsHeaderLink() {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const canView = isNotificationManagerRole(current?.role);
  const notificationsQuery = useNotificationsQuery(
    canView ? organizationId : "",
  );

  if (!canView) return null;

  const count = notificationsQuery.attentionCount;
  const label =
    count > 0
      ? `${count} notification${count === 1 ? "" : "s"} need attention`
      : "Notifications";

  return (
    <Link
      href="/dashboard/notifications"
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={label}
      title={label}
    >
      <LuBell className="size-4" aria-hidden="true" />
      {count > 0 ? (
        <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
