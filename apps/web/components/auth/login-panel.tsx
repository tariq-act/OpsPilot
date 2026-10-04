import {
  LuClipboardList,
  LuCreditCard,
  LuMapPinned,
  LuUserRoundCheck,
} from "react-icons/lu"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const pipeline = [
  {
    label: "Customer Request",
    count: "78",
    icon: LuClipboardList,
    tone: "bg-info/15 text-info",
  },
  {
    label: "Job & Route Match",
    count: "62",
    icon: LuMapPinned,
    tone: "bg-success/15 text-success",
  },
  {
    label: "Technician On-site",
    count: "23",
    icon: LuUserRoundCheck,
    tone: "bg-primary/15 text-primary",
  },
  {
    label: "Payment & Invoicing",
    count: "14",
    icon: LuCreditCard,
    tone: "bg-warning/15 text-warning-emphasis",
  },
] as const

export function LoginPanel() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
          Operations, simplified.
        </h1>
        <p className="text-base leading-relaxed text-foreground-secondary">
          The operating system for trade contractors. Schedule jobs, dispatch
          technicians, and get paid—without the spreadsheet chaos.
        </p>
      </div>

      <Card className="max-w-md rounded-2xl shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Field service status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          {pipeline.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-hover/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full ${item.tone}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-foreground-secondary tabular-nums ring-1 ring-border">
                  {item.count}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="grid max-w-md grid-cols-2 gap-6 border-t border-border pt-6">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            99.98%
          </p>
          <p className="text-sm text-muted-foreground">Platform uptime</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            1.4M+
          </p>
          <p className="text-sm text-muted-foreground">Work orders completed</p>
        </div>
      </div>
    </div>
  )
}
