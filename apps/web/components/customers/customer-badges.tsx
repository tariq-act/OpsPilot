import { Badge } from "@/components/ui/badge";
import { CUSTOMER_STATUS_LABEL } from "@/lib/customer-status";
import { cn } from "@/lib/utils";
import type { CustomerStatus } from "@/lib/types";

const statusClassName: Record<CustomerStatus, string> = {
  ACTIVE:
    "border-status-completed-border bg-status-completed text-status-completed-foreground",
  INACTIVE:
    "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge variant="ghost" className={cn(statusClassName[status])}>
      {CUSTOMER_STATUS_LABEL[status]}
    </Badge>
  );
}
