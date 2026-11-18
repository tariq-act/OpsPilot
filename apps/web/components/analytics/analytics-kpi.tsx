"use client";

import { cn } from "@/lib/utils";

type AnalyticsKpiProps = {
  label: string;
  value: string | null;
  isLoading?: boolean;
  isError?: boolean;
  emptyLabel?: string | null;
  hint?: string | null;
  className?: string;
};

export function AnalyticsKpi({
  label,
  value,
  isLoading,
  isError,
  emptyLabel,
  hint,
  className,
}: AnalyticsKpiProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        className,
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <>
          <div
            className="mt-2 h-9 w-24 animate-pulse rounded-md bg-muted"
            aria-hidden="true"
          />
          <span className="sr-only">Loading {label}</span>
        </>
      ) : null}
      {isError ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Unavailable
        </p>
      ) : null}
      {!isLoading && !isError && value !== null ? (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          {emptyLabel ? (
            <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
          ) : null}
          {hint ? (
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </>
      ) : null}
      {!isLoading && !isError && value === null ? (
        <p className="mt-2 text-sm text-muted-foreground">No data</p>
      ) : null}
    </div>
  );
}
