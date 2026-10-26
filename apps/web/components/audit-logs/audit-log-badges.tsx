import { Badge } from "@/components/ui/badge";
import {
  getAuditActionLabel,
  getAuditEntityTypeLabel,
  isAuditFailureAction,
} from "@/lib/audit-labels";
import { cn } from "@/lib/utils";

export function AuditActionBadge({ action }: { action: string }) {
  const failure = isAuditFailureAction(action);
  return (
    <Badge
      variant={failure ? "destructive" : "secondary"}
      className={cn(!failure && "bg-primary/10 text-primary hover:bg-primary/10")}
    >
      {getAuditActionLabel(action)}
    </Badge>
  );
}

export function AuditEntityTypeBadge({ entityType }: { entityType: string }) {
  return (
    <Badge variant="outline">{getAuditEntityTypeLabel(entityType)}</Badge>
  );
}
