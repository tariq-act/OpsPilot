import { BrandLogo } from "@/components/brand/brand-logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1">
        <BrandLogo size={48} priority />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          OpsPilot
        </span>
      </div>
      <Badge
        variant="secondary"
        className="bg-primary/10 text-primary-emphasis hover:bg-primary/10"
      >
        Early Access
      </Badge>
    </div>
  );
}
