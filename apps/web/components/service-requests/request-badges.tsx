import { Badge } from "@/components/ui/badge";
import {
  SERVICE_REQUEST_PRIORITY_LABEL,
  SERVICE_REQUEST_STATUS_LABEL,
} from "@/lib/service-request-status";
import { cn } from "@/lib/utils";
import type { ServiceRequestPriority, ServiceRequestStatus } from "@/lib/types";

const statusClassName: Record<ServiceRequestStatus, string> = {
  NEW: "border-status-new-border bg-status-new text-status-new-foreground",
  IN_REVIEW:
    "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  ACCEPTED:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  REJECTED:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
  CANCELLED:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
};

const priorityClassName: Record<ServiceRequestPriority, string> = {
  LOW: "border-border bg-muted text-muted-foreground",
  MEDIUM: "border-border bg-secondary text-secondary-foreground",
  HIGH: "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  URGENT:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
};

export function ServiceRequestStatusBadge({
  status,
}: {
  status: ServiceRequestStatus;
}) {
  return (
    <Badge variant="ghost" className={cn(statusClassName[status])}>
      {SERVICE_REQUEST_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ServiceRequestPriorityBadge({
  priority,
}: {
  priority: ServiceRequestPriority;
}) {
  return (
    <Badge variant="ghost" className={cn(priorityClassName[priority])}>
      {SERVICE_REQUEST_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
