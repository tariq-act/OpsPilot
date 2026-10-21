import { Badge } from "@/components/ui/badge";
import {
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_EVENT_TYPE_LABEL,
  NOTIFICATION_STATUS_LABEL,
} from "@/lib/notification-labels";
import { cn } from "@/lib/utils";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from "@/lib/types";

const statusClassName: Record<NotificationStatus, string> = {
  PENDING:
    "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  PROCESSING:
    "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  SENT: "border-status-completed-border bg-status-completed text-status-completed-foreground",
  FAILED:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
};

export function NotificationStatusBadge({
  status,
}: {
  status: NotificationStatus;
}) {
  return (
    <Badge variant="ghost" className={cn(statusClassName[status])}>
      {NOTIFICATION_STATUS_LABEL[status]}
    </Badge>
  );
}

export function NotificationEventBadge({
  eventType,
}: {
  eventType: NotificationEventType;
}) {
  return (
    <Badge variant="secondary">
      {NOTIFICATION_EVENT_TYPE_LABEL[eventType]}
    </Badge>
  );
}

export function NotificationChannelBadge({
  channel,
}: {
  channel: NotificationChannel;
}) {
  return (
    <Badge variant="outline">{NOTIFICATION_CHANNEL_LABEL[channel]}</Badge>
  );
}
