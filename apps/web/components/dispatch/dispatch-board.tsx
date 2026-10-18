"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuCalendarPlus, LuChevronLeft, LuChevronRight } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { AssignJobDialog } from "@/components/dispatch/assign-job-dialog";
import { DispatchJobCard } from "@/components/dispatch/dispatch-job-card";
import { ScheduleJobDialog } from "@/components/dispatch/schedule-job-dialog";
import { TechnicianWorkloadPanel } from "@/components/dispatch/technician-workload-panel";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  addLocalDays,
  formatDateParam,
  parseDateParam,
  todayLocal,
} from "@/lib/dispatch-date";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import { useCustomersQuery } from "@/lib/query/customers";
import { useDispatchDay } from "@/lib/query/dispatch";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useCompleteJobMutation,
  useUpdateJobProgressMutation,
} from "@/lib/query/jobs";
import { useOrganizationMembersQuery } from "@/lib/query/organizations";
import { useTechniciansQuery } from "@/lib/query/technicians";
import type { Job, JobStatus, UpdateJobProgressInput } from "@/lib/types";

export function DispatchBoard() {
  const { current } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";

  const dateParam = searchParams.get("date") ?? "";
  const selectedDate = parseDateParam(dateParam) ?? todayLocal();

  const techniciansQuery = useTechniciansQuery(organizationId, {
    status: "ACTIVE",
  });
  const customersQuery = useCustomersQuery(organizationId);
  const membersQuery = useOrganizationMembersQuery(organizationId);
  const dispatchDay = useDispatchDay(
    organizationId,
    selectedDate,
    techniciansQuery.technicians,
  );

  const progressMutation = useUpdateJobProgressMutation(organizationId);
  const completeMutation = useCompleteJobMutation(organizationId);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleJobId, setScheduleJobId] = useState<string | null>(null);
  const [scheduleJob, setScheduleJob] = useState<Job | null>(null);
  const [assignJob, setAssignJob] = useState<Job | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [completeJob, setCompleteJob] = useState<Job | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filterTechnicianId, setFilterTechnicianId] = useState<string | null>(
    null,
  );

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersQuery.customers) {
      map.set(customer.id, customer.name);
    }
    return map;
  }, [customersQuery.customers]);

  const technicianLabelById = useMemo(() => {
    const memberByUserId = new Map(
      membersQuery.members.map((member) => [
        member.userId,
        member.userName,
      ] as const),
    );
    const map = new Map<string, string>();
    for (const technician of techniciansQuery.technicians) {
      const name = memberByUserId.get(technician.userId);
      map.set(
        technician.id,
        name ? `${name} (${technician.employeeCode})` : technician.employeeCode,
      );
    }
    return map;
  }, [membersQuery.members, techniciansQuery.technicians]);

  const technicianDayJobsById = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const schedule of dispatchDay.technicianSchedules) {
      map.set(schedule.technician.id, schedule.jobs);
    }
    return map;
  }, [dispatchDay.technicianSchedules]);

  const visibleSchedules = filterTechnicianId
    ? dispatchDay.technicianSchedules.filter(
        (schedule) => schedule.technician.id === filterTechnicianId,
      )
    : dispatchDay.technicianSchedules;

  function setDate(next: Date | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next) {
      params.delete("date");
    } else {
      params.set("date", formatDateParam(next));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function shiftDay(delta: number) {
    setDate(addLocalDays(selectedDate, delta));
  }

  function resetFeedback() {
    setActionError(null);
    setActionSuccess(null);
  }

  function openSchedule(job?: Job | null) {
    resetFeedback();
    setScheduleJob(job ?? null);
    setScheduleJobId(job?.id ?? null);
    setScheduleOpen(true);
  }

  function openAssign(job: Job) {
    resetFeedback();
    setAssignJob(job);
    setAssignOpen(true);
  }

  async function runStatusAction(job: Job) {
    resetFeedback();
    if (job.status === "DRAFT") {
      openSchedule(job);
      return;
    }
    if (job.status === "IN_PROGRESS") {
      setCompleteJob(job);
      setCompletionSummary("");
      setCompleteOpen(true);
      return;
    }

    const nextByStatus: Partial<
      Record<JobStatus, UpdateJobProgressInput["status"]>
    > = {
      CONFIRMED: "EN_ROUTE",
      EN_ROUTE: "ARRIVED",
      ARRIVED: "IN_PROGRESS",
    };
    const nextStatus = nextByStatus[job.status];
    if (!nextStatus) return;

    try {
      await progressMutation.mutateAsync({
        id: job.id,
        body: { status: nextStatus },
      });
      setActionSuccess(`Status updated to ${JOB_STATUS_LABEL[nextStatus]}.`);
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to update job progress."),
      );
    }
  }

  async function submitComplete() {
    if (!completeJob) return;
    resetFeedback();
    if (!completionSummary.trim()) {
      setActionError("Completion summary is required.");
      return;
    }
    try {
      await completeMutation.mutateAsync({
        id: completeJob.id,
        body: { completionSummary: completionSummary.trim() },
      });
      setCompleteOpen(false);
      setCompleteJob(null);
      setActionSuccess("Job completed.");
    } catch (error) {
      setActionError(toUserErrorMessage(error, "Unable to complete the job."));
    }
  }

  const statusPending =
    progressMutation.isPending || completeMutation.isPending;

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dispatch" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scheduling & Dispatch"
        description={`Day schedule · ${formatDateParam(selectedDate)} (${timeZone})`}
        actions={
          <Button type="button" onClick={() => openSchedule()}>
            <LuCalendarPlus aria-hidden="true" />
            Schedule job
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous day"
            onClick={() => shiftDay(-1)}
          >
            <LuChevronLeft aria-hidden="true" />
          </Button>
          <div className="min-w-[12rem]">
            <DatePicker
              value={selectedDate}
              onChange={(date) => setDate(date ? addLocalDays(date, 0) : todayLocal())}
              placeholder="Select day"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next day"
            onClick={() => shiftDay(1)}
          >
            <LuChevronRight aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDate(todayLocal())}
          >
            Today
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Jobs are filtered by schedule overlap for the selected day.
        </p>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="text-sm text-foreground" aria-live="polite">
          {actionSuccess}
        </p>
      ) : null}

      {dispatchDay.isLoading || techniciansQuery.server.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : dispatchDay.isError || techniciansQuery.server.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {dispatchDay.errorMessage ??
              techniciansQuery.server.error?.message ??
              "Unable to load the dispatch board."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => {
              dispatchDay.refetchAll();
              void techniciansQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-4">
            {!filterTechnicianId ? (
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Unassigned
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {dispatchDay.unassignedJobs.length} job
                    {dispatchDay.unassignedJobs.length === 1 ? "" : "s"}
                  </span>
                </div>
                {dispatchDay.unassignedJobs.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No unassigned scheduled jobs for this day.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {dispatchDay.unassignedJobs.map((job) => (
                      <DispatchJobCard
                        key={job.id}
                        job={job}
                        customerName={
                          customerNameById.get(job.customerId) ?? "Customer"
                        }
                        timeZone={timeZone}
                        onAssign={() => openAssign(job)}
                        onSchedule={() => openSchedule(job)}
                        onStatusAction={() => void runStatusAction(job)}
                        statusPending={statusPending}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {visibleSchedules.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No technician columns to show
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add active technicians or clear the workload filter.
                </p>
              </section>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleSchedules.map((schedule) => {
                  const label =
                    technicianLabelById.get(schedule.technician.id) ??
                    schedule.technician.employeeCode;
                  return (
                    <section
                      key={schedule.technician.id}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">
                            {label}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {schedule.jobCount} assigned ·{" "}
                            {schedule.hasConflict
                              ? "Conflict detected"
                              : schedule.workload === "busy"
                                ? "Busy"
                                : schedule.workload === "moderate"
                                  ? "On schedule"
                                  : "Free"}
                          </p>
                        </div>
                      </div>
                      {schedule.jobs.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No jobs assigned for this day.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-col gap-3">
                          {schedule.jobs.map((job) => (
                            <DispatchJobCard
                              key={job.id}
                              job={job}
                              customerName={
                                customerNameById.get(job.customerId) ??
                                "Customer"
                              }
                              technicianLabel={label}
                              timeZone={timeZone}
                              hasConflict={schedule.conflictJobIds.has(job.id)}
                              onAssign={() => openAssign(job)}
                              onSchedule={() => openSchedule(job)}
                              onStatusAction={() => void runStatusAction(job)}
                              statusPending={statusPending}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {dispatchDay.dayJobs.length === 0 &&
            dispatchDay.technicianSchedules.every(
              (schedule) => schedule.jobs.length === 0,
            ) ? (
              <section className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Nothing scheduled this day
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Schedule a job or pick another date.
                </p>
                <Button
                  type="button"
                  className="mt-4"
                  onClick={() => openSchedule()}
                >
                  Schedule job
                </Button>
              </section>
            ) : null}
          </div>

          <TechnicianWorkloadPanel
            schedules={dispatchDay.technicianSchedules}
            labelByTechnicianId={technicianLabelById}
            selectedTechnicianId={filterTechnicianId}
            onSelect={setFilterTechnicianId}
          />
        </div>
      )}

      <ScheduleJobDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        organizationId={organizationId}
        technicians={techniciansQuery.technicians}
        technicianLabelById={technicianLabelById}
        initialJobId={scheduleJobId}
        initialJob={scheduleJob}
        technicianDayJobsById={technicianDayJobsById}
        defaultDate={selectedDate}
        onSuccess={(message) => {
          setActionSuccess(message);
          dispatchDay.refetchAll();
        }}
      />

      <AssignJobDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        organizationId={organizationId}
        job={assignJob}
        technicians={techniciansQuery.technicians}
        technicianLabelById={technicianLabelById}
        technicianDayJobsById={technicianDayJobsById}
        onSuccess={(message) => {
          setActionSuccess(message);
          dispatchDay.refetchAll();
        }}
      />

      <Dialog
        open={completeOpen}
        onOpenChange={(open) => {
          if (completeMutation.isPending) return;
          setCompleteOpen(open);
          if (!open) setCompleteJob(null);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete job</DialogTitle>
            <DialogDescription>
              {completeJob
                ? `Provide a completion summary for “${completeJob.title}”.`
                : "Provide a completion summary."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dispatch-complete-summary">Completion summary</Label>
            <Textarea
              id="dispatch-complete-summary"
              value={completionSummary}
              onChange={(event) => setCompletionSummary(event.target.value)}
              rows={4}
              maxLength={5000}
              disabled={completeMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompleteOpen(false)}
              disabled={completeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitComplete()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Completing…" : "Complete job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
