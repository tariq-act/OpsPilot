"use client";

import { useOrg } from "@/components/providers/org-provider";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard dashboard page header used at the top of every main content area.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Breadcrumb showing the current organization name before the page title.
 */
export function OrgBreadcrumb({ page }: { page: string }) {
  const { current } = useOrg();
  return (
    <p className="text-sm text-muted-foreground">
      {current ? (
        <>
          <span className="font-medium text-foreground">{current.name}</span>
          <span aria-hidden="true"> / </span>
        </>
      ) : null}
      {page}
    </p>
  );
}
