"use client";

import { cn } from "@/lib/utils";

export type BarDatum = {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
};

type HorizontalBarsProps = {
  title: string;
  description?: string;
  data: BarDatum[];
  emptyLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
};

export function HorizontalBarsChart({
  title,
  description,
  data,
  emptyLabel = "No data for this range.",
  isLoading,
  isError,
  errorMessage,
  onRetry,
  className,
}: HorizontalBarsProps) {
  const max = Math.max(...data.map((row) => row.value), 0);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        className,
      )}
      aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
    >
      <h2
        id={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
        className="text-sm font-semibold text-foreground"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-8 animate-pulse rounded-md bg-muted" />
          ))}
          <span className="sr-only">Loading {title}</span>
        </div>
      ) : null}

      {isError ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-destructive">
            {errorMessage ?? "Unable to load chart."}
          </p>
          {onRetry ? (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
              onClick={onRetry}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : null}

      {!isLoading && !isError && data.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3" role="list">
          {data.map((row) => {
            const width =
              max > 0 ? Math.max((row.value / max) * 100, row.value > 0 ? 4 : 0) : 0;
            return (
              <li key={row.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-foreground">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {row.displayValue ?? row.value}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-muted"
                  role="img"
                  aria-label={`${row.label}: ${row.displayValue ?? row.value}`}
                >
                  <div
                    className="h-2 rounded-full bg-primary transition-[width]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

type VerticalBarsProps = {
  title: string;
  description?: string;
  data: BarDatum[];
  emptyLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
};

export function VerticalBarsChart({
  title,
  description,
  data,
  emptyLabel = "No data for this range.",
  isLoading,
  isError,
  errorMessage,
  onRetry,
  className,
}: VerticalBarsProps) {
  const max = Math.max(...data.map((row) => row.value), 0);
  const headingId = `${title.replace(/\s+/g, "-").toLowerCase()}-heading`;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        className,
      )}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="text-sm font-semibold text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}

      {isLoading ? (
        <div
          className="mt-6 flex h-40 items-end gap-2"
          aria-busy="true"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex-1 animate-pulse rounded-t-md bg-muted"
              style={{ height: `${30 + ((index * 17) % 60)}%` }}
            />
          ))}
          <span className="sr-only">Loading {title}</span>
        </div>
      ) : null}

      {isError ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-destructive">
            {errorMessage ?? "Unable to load chart."}
          </p>
          {onRetry ? (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
              onClick={onRetry}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : null}

      {!isLoading && !isError && data.length > 0 ? (
        <div className="mt-6">
          <div
            className="flex h-40 items-end gap-1.5 sm:gap-2"
            role="img"
            aria-label={title}
          >
            {data.map((row) => {
              const height =
                max > 0
                  ? Math.max((row.value / max) * 100, row.value > 0 ? 6 : 0)
                  : 0;
              return (
                <div
                  key={row.id}
                  className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <div
                    className="w-full max-w-[2.5rem] rounded-t-md bg-primary transition-opacity group-hover:opacity-90"
                    style={{ height: `${height}%` }}
                    title={`${row.label}: ${row.displayValue ?? row.value}`}
                  />
                  <span className="sr-only">
                    {row.label}: {row.displayValue ?? row.value}
                  </span>
                </div>
              );
            })}
          </div>
          <ul className="mt-3 flex gap-1.5 sm:gap-2" aria-hidden="true">
            {data.map((row) => (
              <li
                key={row.id}
                className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground sm:text-xs"
                title={row.label}
              >
                {row.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
