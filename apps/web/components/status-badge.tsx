import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Calendar,
  Circle,
  CircleCheck,
  Inbox,
  Navigation,
  Play,
  UserCheck,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const opsStatuses = [
  "new",
  "scheduled",
  "assigned",
  "en-route",
  "in-progress",
  "completed",
  "cancelled",
  "paid",
  "overdue",
  "available",
  "working",
  "offline",
] as const

export type OpsStatus = (typeof opsStatuses)[number]

type StatusPresentation = {
  label: string
  icon: LucideIcon
  className: string
}

export const statusPresentation: Record<OpsStatus, StatusPresentation> = {
  new: {
    label: "New",
    icon: Inbox,
    className:
      "border-status-new-border bg-status-new text-status-new-foreground",
  },
  scheduled: {
    label: "Scheduled",
    icon: Calendar,
    className:
      "border-status-scheduled-border bg-status-scheduled text-status-scheduled-foreground",
  },
  assigned: {
    label: "Assigned",
    icon: UserCheck,
    className:
      "border-status-assigned-border bg-status-assigned text-status-assigned-foreground",
  },
  "en-route": {
    label: "En Route",
    icon: Navigation,
    className:
      "border-status-en-route-border bg-status-en-route text-status-en-route-foreground",
  },
  "in-progress": {
    label: "In Progress",
    icon: Play,
    className:
      "border-status-in-progress-border bg-status-in-progress text-status-in-progress-foreground",
  },
  completed: {
    label: "Completed",
    icon: CircleCheck,
    className:
      "border-status-completed-border bg-status-completed text-status-completed-foreground",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    className:
      "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
  },
  paid: {
    label: "Paid",
    icon: BadgeCheck,
    className:
      "border-status-paid-border bg-status-paid text-status-paid-foreground",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className:
      "border-status-overdue-border bg-status-overdue text-status-overdue-foreground",
  },
  available: {
    label: "Available",
    icon: Circle,
    className:
      "border-status-available-border bg-status-available text-status-available-foreground",
  },
  working: {
    label: "Working",
    icon: Briefcase,
    className:
      "border-status-working-border bg-status-working text-status-working-foreground",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    className:
      "border-status-offline-border bg-status-offline text-status-offline-foreground",
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: OpsStatus
  className?: string
}) {
  const presentation = statusPresentation[status]
  const Icon = presentation.icon

  return (
    <Badge variant="ghost" className={cn(presentation.className, className)}>
      <Icon aria-hidden="true" />
      {presentation.label}
    </Badge>
  )
}
