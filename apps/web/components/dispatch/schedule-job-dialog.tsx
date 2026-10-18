"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  combineDateAndTime,
  startOfLocalDay,
  todayLocal,
} from "@/lib/dispatch-date";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useAssignTechniciansMutation,
  useJobsQuery,
  useScheduleJobMutation,
} from "@/lib/query/jobs";
import { wouldOverlapExisting, jobsToWindows } from "@/lib/schedule-overlap";
import type { Job, Technician } from "@/lib/types";

type EndMode = "time" | "duration";

type ScheduleJobDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  technicians: Technician[];
  technicianLabelById: Map<string, string>;
  /** Pre-select a job when opened from a card. */
  initialJobId?: string | null;
  /** Optional job record so reschedule works for non-draft statuses. */
  initialJob?: Job | null;
  /** Jobs already loaded for the selected technician (overlap preview). */
  technicianDayJobsById: Map<string, Job[]>;
  defaultDate?: Date;
  onSuccess?: (message: string) => void;
};

export function ScheduleJobDialog({
  open,
  onOpenChange,
  organizationId,
  technicians,
  technicianLabelById,
  initialJobId = null,
  initialJob = null,
  technicianDayJobsById,
  defaultDate,
  onSuccess,
}: ScheduleJobDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      {open ? (
        <ScheduleJobDialogBody
          key={`${initialJobId ?? "new"}-${defaultDate ? startOfLocalDay(defaultDate).getTime() : "today"}`}
          onOpenChange={onOpenChange}
          organizationId={organizationId}
          technicians={technicians}
          technicianLabelById={technicianLabelById}
          initialJobId={initialJobId}
          initialJob={initialJob}
          technicianDayJobsById={technicianDayJobsById}
          defaultDate={defaultDate}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  );
}

function ScheduleJobDialogBody({
  onOpenChange,
  organizationId,
  technicians,
  technicianLabelById,
  initialJobId,
  initialJob,
  technicianDayJobsById,
  defaultDate,
  onSuccess,
}: Omit<ScheduleJobDialogProps, "open">) {
  const scheduleMutation = useScheduleJobMutation(organizationId);
  const assignMutation = useAssignTechniciansMutation(organizationId);

  const draftJobsQuery = useJobsQuery(organizationId, { status: "DRAFT" });
  const confirmedJobsQuery = useJobsQuery(organizationId, {
    status: "CONFIRMED",
  });

  const schedulableJobs = useMemo(() => {
    const byId = new Map<string, Job>();
    for (const job of draftJobsQuery.jobs) byId.set(job.id, job);
    for (const job of confirmedJobsQuery.jobs) {
      if (job.scheduledStart) byId.set(job.id, job);
    }
    if (
      initialJob &&
      initialJob.status !== "COMPLETED" &&
      initialJob.status !== "CANCELLED"
    ) {
      byId.set(initialJob.id, initialJob);
    }
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [draftJobsQuery.jobs, confirmedJobsQuery.jobs, initialJob]);

  const seedJob =
    initialJob ??
    schedulableJobs.find((job) => job.id === initialJobId) ??
    null;

  const [jobId, setJobId] = useState<string | null>(initialJobId ?? null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(
    defaultDate ? startOfLocalDay(defaultDate) : todayLocal(),
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endMode, setEndMode] = useState<EndMode>("time");
  const [endTime, setEndTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(
    seedJob?.estimatedDuration
      ? String(seedJob.estimatedDuration)
      : "60",
  );
  const [location, setLocation] = useState(seedJob?.location ?? "");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedJob = schedulableJobs.find((job) => job.id === jobId) ?? null;
  const activeTechnicians = technicians.filter(
    (technician) => technician.status === "ACTIVE",
  );

  const pending = scheduleMutation.isPending || assignMutation.isPending;

  const previewWindow = useMemo(() => {
    if (!date) return null;
    const startIso = combineDateAndTime(date, startTime);
    if (!startIso) return null;
    if (endMode === "duration") {
      const minutes = Number(durationMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) return null;
      const end = new Date(startIso);
      end.setMinutes(end.getMinutes() + minutes);
      return { startIso, endIso: end.toISOString() };
    }
    const endIso = combineDateAndTime(date, endTime);
    if (!endIso) return null;
    return { startIso, endIso };
  }, [date, startTime, endMode, endTime, durationMinutes]);

  const clientOverlap =
    previewWindow &&
    technicianId &&
    wouldOverlapExisting(
      jobsToWindows(technicianDayJobsById.get(technicianId) ?? []),
      previewWindow.startIso,
      previewWindow.endIso,
      jobId ?? undefined,
    );

  function validate(): string | null {
    if (!jobId) return "Select a job.";
    if (!date) return "Select a date.";
    if (!previewWindow) {
      return endMode === "duration"
        ? "Enter a valid start time and duration."
        : "Enter valid start and end times.";
    }
    if (new Date(previewWindow.endIso) <= new Date(previewWindow.startIso)) {
      return "End must be after start.";
    }
    return null;
  }

  function requestSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function submit() {
    if (!jobId || !previewWindow || !selectedJob) return;
    setError(null);
    try {
      await scheduleMutation.mutateAsync({
        id: jobId,
        mode: selectedJob.status === "DRAFT" ? "schedule" : "reschedule",
        body: {
          scheduledStart: previewWindow.startIso,
          scheduledEnd: previewWindow.endIso,
          location: location.trim() || undefined,
          allowOverlap: allowOverlap || undefined,
        },
      });

      const isInitialSchedule = selectedJob.status === "DRAFT";
      const shouldAssign = Boolean(technicianId) && isInitialSchedule;
      if (shouldAssign && technicianId) {
        await assignMutation.mutateAsync({
          id: jobId,
          body: {
            technicianIds: [technicianId],
            allowOverlap: allowOverlap || undefined,
          },
        });
      }

      setConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.(
        shouldAssign
          ? "Job scheduled and technician assigned."
          : isInitialSchedule
            ? "Job scheduled and confirmed."
            : "Schedule updated.",
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && !allowOverlap) {
        setError(
          `${toUserErrorMessage(err, "Scheduling conflict detected.")} Enable allow overlap to submit anyway.`,
        );
      } else {
        setError(toUserErrorMessage(err, "Unable to save the schedule."));
      }
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a job</DialogTitle>
          <DialogDescription>
            Set the schedule window and optionally assign an active technician
            for draft jobs. Conflicts are checked by the API when assigning or
            rescheduling assigned jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dispatch-schedule-job">Job</Label>
            <Select
              value={jobId}
              onValueChange={setJobId}
              disabled={pending || Boolean(initialJobId)}
            >
              <SelectTrigger id="dispatch-schedule-job" className="w-full">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {schedulableJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} (
                    {job.status === "DRAFT" ? "Draft" : "Confirmed"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {schedulableJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No draft or confirmed jobs available to schedule.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dispatch-schedule-technician">Technician</Label>
            <Select
              value={technicianId}
              onValueChange={setTechnicianId}
              disabled={pending}
            >
              <SelectTrigger
                id="dispatch-schedule-technician"
                className="w-full"
              >
                <SelectValue placeholder="Optional for draft jobs" />
              </SelectTrigger>
              <SelectContent>
                {activeTechnicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technicianLabelById.get(technician.id) ??
                      technician.employeeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Date</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              disabled={pending}
              placeholder="Select date"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dispatch-schedule-start">Start time</Label>
              <Input
                id="dispatch-schedule-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dispatch-schedule-end-mode">End</Label>
              <Select
                value={endMode}
                onValueChange={(value) => setEndMode(value as EndMode)}
                disabled={pending}
              >
                <SelectTrigger
                  id="dispatch-schedule-end-mode"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">End time</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {endMode === "time" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="dispatch-schedule-end">End time</Label>
              <Input
                id="dispatch-schedule-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={pending}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="dispatch-schedule-duration">
                Duration (minutes)
              </Label>
              <Input
                id="dispatch-schedule-duration"
                type="number"
                min={1}
                step={15}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                disabled={pending}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="dispatch-schedule-location">Location</Label>
            <Input
              id="dispatch-schedule-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={500}
              disabled={pending}
              placeholder="Optional"
            />
          </div>

          {clientOverlap ? (
            <p className="rounded-lg bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue-foreground">
              This window overlaps another job for the selected technician
              today.
            </p>
          ) : null}

          <Label className="flex cursor-pointer items-center gap-2 font-normal">
            <Checkbox
              checked={allowOverlap}
              onCheckedChange={(checked) => setAllowOverlap(checked === true)}
              disabled={pending}
            />
            Allow schedule overlap (when the API would otherwise reject)
          </Label>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={requestSubmit} disabled={pending}>
            Review
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (pending) return;
          setConfirmOpen(next);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm schedule</DialogTitle>
            <DialogDescription>
              {selectedJob
                ? `Schedule “${selectedJob.title}”`
                : "Schedule this job"}
              {technicianId && selectedJob?.status === "DRAFT"
                ? ` and assign ${technicianLabelById.get(technicianId) ?? "the selected technician"}`
                : ""}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={pending}
            >
              {pending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
