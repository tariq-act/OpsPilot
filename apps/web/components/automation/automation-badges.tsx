import { Badge } from "@/components/ui/badge";
import {
  AUTOMATION_ACTION_TYPE_LABEL,
  AUTOMATION_EXECUTION_STATUS_LABEL,
  AUTOMATION_TRIGGER_LABEL,
} from "@/lib/automation-labels";
import { cn } from "@/lib/utils";
import type {
  AutomationActionType,
  AutomationExecutionStatus,
  AutomationTrigger,
} from "@/lib/types";

const activeClassName =
  "border-status-completed-border bg-status-completed text-status-completed-foreground";
const inactiveClassName =
  "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground";

const executionStatusClassName: Record<AutomationExecutionStatus, string> = {
  PENDING:
    "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  RUNNING:
    "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  SUCCEEDED:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  FAILED:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
};

export function AutomationActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="ghost"
      className={cn(isActive ? activeClassName : inactiveClassName)}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

export function AutomationTriggerBadge({
  trigger,
}: {
  trigger: AutomationTrigger;
}) {
  return (
    <Badge variant="secondary">{AUTOMATION_TRIGGER_LABEL[trigger]}</Badge>
  );
}

export function AutomationActionBadge({
  actionType,
}: {
  actionType: AutomationActionType;
}) {
  return (
    <Badge variant="outline">
      {AUTOMATION_ACTION_TYPE_LABEL[actionType]}
    </Badge>
  );
}

export function AutomationExecutionStatusBadge({
  status,
}: {
  status: AutomationExecutionStatus;
}) {
  return (
    <Badge variant="ghost" className={cn(executionStatusClassName[status])}>
      {AUTOMATION_EXECUTION_STATUS_LABEL[status]}
    </Badge>
  );
}
