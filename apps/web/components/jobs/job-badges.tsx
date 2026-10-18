import { Badge } from "@/components/ui/badge";
import { JOB_PRIORITY_LABEL, JOB_STATUS_LABEL } from "@/lib/job-status";
import { cn } from "@/lib/utils";
import type { JobPriority, JobStatus } from "@/lib/types";

const statusClassName: Record<JobStatus, string> = {
  DRAFT: "border-status-new-border bg-status-new text-status-new-foreground",
  CONFIRMED:
    "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  EN_ROUTE:
    "border-status-en-route-border bg-status-en-route text-status-en-route-foreground",
  ARRIVED:
    "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  IN_PROGRESS:
    "border-status-in-progress-border bg-status-in-progress text-status-in-progress-foreground",
  COMPLETED:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  CANCELLED:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
};

const priorityClassName: Record<JobPriority, string> = {
  LOW: "border-border bg-muted text-muted-foreground",
  MEDIUM: "border-border bg-secondary text-secondary-foreground",
  HIGH: "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  URGENT:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="ghost" className={cn(statusClassName[status])}>
      {JOB_STATUS_LABEL[status]}
    </Badge>
  );
}

export function JobPriorityBadge({ priority }: { priority: JobPriority }) {
  return (
    <Badge variant="ghost" className={cn(priorityClassName[priority])}>
      {JOB_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
