import { LuCompass } from "react-icons/lu"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <LuCompass className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        OpsPilot
      </span>
      <Badge
        variant="secondary"
        className="bg-primary/10 text-primary-emphasis hover:bg-primary/10"
      >
        Early Access
      </Badge>
    </div>
  )
}
