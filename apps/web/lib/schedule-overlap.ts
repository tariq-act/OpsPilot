import type { Job } from "@/lib/types";

/**
 * Detect overlapping schedule windows from job records returned by the API.
 * Mirrors backend overlap: scheduledStart < otherEnd && scheduledEnd > otherStart.
 */

export type ScheduleWindow = {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export function jobsToWindows(jobs: Job[]): ScheduleWindow[] {
  const windows: ScheduleWindow[] = [];
  for (const job of jobs) {
    if (!job.scheduledStart || !job.scheduledEnd) continue;
    if (job.status === "CANCELLED" || job.status === "COMPLETED") continue;
    windows.push({
      id: job.id,
      scheduledStart: job.scheduledStart,
      scheduledEnd: job.scheduledEnd,
    });
  }
  return windows;
}

export function windowsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function findOverlappingJobIds(windows: ScheduleWindow[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < windows.length; i += 1) {
    const a = windows[i];
    if (!a) continue;
    for (let j = i + 1; j < windows.length; j += 1) {
      const b = windows[j];
      if (!b) continue;
      if (
        windowsOverlap(
          a.scheduledStart,
          a.scheduledEnd,
          b.scheduledStart,
          b.scheduledEnd,
        )
      ) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}

export function wouldOverlapExisting(
  windows: ScheduleWindow[],
  scheduledStart: string,
  scheduledEnd: string,
  excludeJobId?: string,
): boolean {
  return windows.some((window) => {
    if (excludeJobId && window.id === excludeJobId) return false;
    return windowsOverlap(
      scheduledStart,
      scheduledEnd,
      window.scheduledStart,
      window.scheduledEnd,
    );
  });
}

/** Workload load from real assigned job counts for the day. */
export type WorkloadLevel = "free" | "moderate" | "busy";

export function workloadLevel(jobCount: number): WorkloadLevel {
  if (jobCount <= 0) return "free";
  if (jobCount <= 2) return "moderate";
  return "busy";
}
