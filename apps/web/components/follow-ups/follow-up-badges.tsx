import { Badge } from "@/components/ui/badge";
import {
  FOLLOW_UP_STATUS_LABEL,
  FOLLOW_UP_TYPE_LABEL,
} from "@/lib/follow-up-labels";
import { cn } from "@/lib/utils";
import type { FollowUpStatus, FollowUpType } from "@/lib/types";

const statusClassName: Record<FollowUpStatus, string> = {
  PENDING:
    "border-status-new-border bg-status-new text-status-new-foreground",
  SCHEDULED:
    "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  COMPLETED:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  CANCELLED:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
};

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <Badge variant="ghost" className={cn(statusClassName[status])}>
      {FOLLOW_UP_STATUS_LABEL[status]}
    </Badge>
  );
}

export function FollowUpTypeBadge({ type }: { type: FollowUpType }) {
  return <Badge variant="secondary">{FOLLOW_UP_TYPE_LABEL[type]}</Badge>;
}
