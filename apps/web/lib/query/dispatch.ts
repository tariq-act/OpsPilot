"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { toIsoDateEnd, toIsoDateStart } from "@/lib/dispatch-date";
import { toUserErrorMessage } from "@/lib/query/errors";
import { jobQueries, useJobsQuery } from "@/lib/query/jobs";
import {
  findOverlappingJobIds,
  jobsToWindows,
  workloadLevel,
  type WorkloadLevel,
} from "@/lib/schedule-overlap";
import type { Job, Technician } from "@/lib/types";

export type TechnicianDaySchedule = {
  technician: Technician;
  jobs: Job[];
  jobCount: number;
  workload: WorkloadLevel;
  conflictJobIds: Set<string>;
  hasConflict: boolean;
};

export type DispatchDayData = {
  dayJobs: Job[];
  unassignedJobs: Job[];
  technicianSchedules: TechnicianDaySchedule[];
  jobsById: Map<string, Job>;
  assignedJobIds: Set<string>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetchAll: () => void;
};

/**
 * Day schedule: org jobs overlapping the selected day, plus per-technician
 * active-assignment slices used to group the board.
 */
export function useDispatchDay(
  organizationId: string,
  day: Date,
  technicians: Technician[],
): DispatchDayData {
  const fromDate = toIsoDateStart(day);
  const toDate = toIsoDateEnd(day);

  const dayJobsQuery = useJobsQuery(organizationId, { fromDate, toDate });

  const activeTechnicians = useMemo(
    () => technicians.filter((row) => row.status === "ACTIVE"),
    [technicians],
  );

  const techQueries = useQueries({
    queries: activeTechnicians.map((technician) => ({
      ...jobQueries.list(organizationId, {
        fromDate,
        toDate,
        technicianId: technician.id,
      }),
      enabled: Boolean(organizationId) && Boolean(fromDate) && Boolean(toDate),
    })),
  });

  return useMemo(() => {
    const dayJobs = dayJobsQuery.jobs;
    const jobsById = new Map(dayJobs.map((job) => [job.id, job]));
    const assignedJobIds = new Set<string>();

    const technicianSchedules: TechnicianDaySchedule[] = activeTechnicians.map(
      (technician, index) => {
        const result = techQueries[index];
        const jobs = result?.data?.jobs ?? [];
        for (const job of jobs) {
          assignedJobIds.add(job.id);
          if (!jobsById.has(job.id)) {
            jobsById.set(job.id, job);
          }
        }
        const conflictJobIds = findOverlappingJobIds(jobsToWindows(jobs));
        return {
          technician,
          jobs: [...jobs].sort(sortByScheduledStart),
          jobCount: jobs.length,
          workload: workloadLevel(jobs.length),
          conflictJobIds,
          hasConflict: conflictJobIds.size > 0,
        };
      },
    );

    const unassignedJobs = dayJobs
      .filter((job) => !assignedJobIds.has(job.id))
      .sort(sortByScheduledStart);

    const techLoading = techQueries.some((query) => query.isLoading);
    const techError = techQueries.find((query) => query.isError);

    return {
      dayJobs,
      unassignedJobs,
      technicianSchedules,
      jobsById,
      assignedJobIds,
      isLoading: dayJobsQuery.server.isLoading || techLoading,
      isError: dayJobsQuery.server.isError || Boolean(techError),
      errorMessage: dayJobsQuery.server.isError
        ? (dayJobsQuery.server.error?.message ??
          "Unable to load dispatch jobs.")
        : techError
          ? toUserErrorMessage(
              techError.error,
              "Unable to load technician schedules.",
            )
          : null,
      refetchAll: () => {
        void dayJobsQuery.refetch();
        for (const query of techQueries) {
          void query.refetch();
        }
      },
    };
  }, [activeTechnicians, dayJobsQuery, techQueries]);
}

function sortByScheduledStart(a: Job, b: Job): number {
  const aStart = a.scheduledStart ?? "";
  const bStart = b.scheduledStart ?? "";
  return aStart.localeCompare(bStart);
}
