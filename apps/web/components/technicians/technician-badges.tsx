import { Badge } from "@/components/ui/badge";
import { TECHNICIAN_STATUS_LABEL } from "@/lib/technician-status";
import { cn } from "@/lib/utils";
import type { TechnicianStatus } from "@/lib/types";

const statusClassName: Record<TechnicianStatus, string> = {
  ACTIVE:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  INACTIVE:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
  SUSPENDED:
    "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
};

export function TechnicianStatusBadge({
  status,
}: {
  status: TechnicianStatus;
}) {
  return (
    <Badge variant="ghost" className={cn(statusClassName[status])}>
      {TECHNICIAN_STATUS_LABEL[status]}
    </Badge>
  );
}
