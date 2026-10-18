"use client";

import Link from "next/link";

import { TechnicianStatusBadge } from "@/components/technicians/technician-badges";
import type { TechnicianDaySchedule } from "@/lib/query/dispatch";
import { cn } from "@/lib/utils";

type TechnicianWorkloadPanelProps = {
  schedules: TechnicianDaySchedule[];
  labelByTechnicianId: Map<string, string>;
  selectedTechnicianId: string | null;
  onSelect: (technicianId: string | null) => void;
};

const workloadLabel = {
  free: "Free",
  moderate: "On schedule",
  busy: "Busy",
} as const;

export function TechnicianWorkloadPanel({
  schedules,
  labelByTechnicianId,
  selectedTechnicianId,
  onSelect,
}: TechnicianWorkloadPanelProps) {
  if (schedules.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Technician workload
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          No active technicians in this organization.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Technician workload
        </h2>
        {selectedTechnicianId ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => onSelect(null)}
          >
            Show all
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Today&apos;s assigned jobs from the schedule API.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {schedules.map((schedule) => {
          const { technician, jobCount, workload, hasConflict } = schedule;
          const selected = selectedTechnicianId === technician.id;
          const name =
            labelByTechnicianId.get(technician.id) ?? technician.employeeCode;

          return (
            <li key={technician.id} className="py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() =>
                  onSelect(selected ? null : technician.id)
                }
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : hasConflict || workload === "busy"
                      ? "border-status-overdue-border/60 bg-status-overdue/5 hover:bg-status-overdue/10"
                      : "border-transparent hover:bg-surface-hover",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {technician.employeeCode}
                    </p>
                  </div>
                  <TechnicianStatusBadge status={technician.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    {jobCount} job{jobCount === 1 ? "" : "s"}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 font-medium",
                      workload === "busy"
                        ? "bg-status-overdue text-status-overdue-foreground"
                        : workload === "moderate"
                          ? "bg-status-assigned text-status-assigned-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {workloadLabel[workload]}
                  </span>
                  {hasConflict ? (
                    <span className="font-medium text-status-overdue-foreground">
                      Conflict
                    </span>
                  ) : null}
                </div>
              </button>
              <Link
                href={`/dashboard/technicians/${technician.id}`}
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                Open profile
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
