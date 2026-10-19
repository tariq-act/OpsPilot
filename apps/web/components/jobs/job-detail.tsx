"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-badges";
import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-badges";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/dispatch-date";
import {
  formatCustomerAddress,
  formatDateTime,
  formatMoney,
  shortId,
} from "@/lib/format";
import {
  getPrimaryExecutionActionLabel,
  getPrimaryJobActionLabel,
  JOB_STATUS_LABEL,
} from "@/lib/job-status";
import {
  isInvoiceManagerRole,
  isJobManagerRole,
  isTechnicianRole,
} from "@/lib/member-roles";
import { useCustomerQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useInvoicesQuery } from "@/lib/query/invoices";
import {
  useAssignTechniciansMutation,
  useCancelJobMutation,
  useCompleteJobMutation,
  useJobActivitiesQuery,
  useJobAssignmentsQuery,
  useJobQuery,
  useReassignTechnicianMutation,
  useScheduleJobMutation,
  useUpdateJobAssignmentMutation,
  useUpdateJobProgressMutation,
} from "@/lib/query/jobs";
import { useOrganizationMembersQuery } from "@/lib/query/organizations";
import { useServiceRequestQuery } from "@/lib/query/service-requests";
import { useTechniciansQuery } from "@/lib/query/technicians";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, UpdateJobProgressInput } from "@/lib/types";

function activityLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function JobDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const isManager = isJobManagerRole(current?.role);
  const isTechnician = isTechnicianRole(current?.role);
  const canManageInvoices = isInvoiceManagerRole(current?.role);

  const detailQuery = useJobQuery(organizationId, id);
  const job = detailQuery.job;

  const customerQuery = useCustomerQuery(
    organizationId,
    job?.customerId ?? "",
  );
  const requestQuery = useServiceRequestQuery(
    organizationId,
    job?.requestId ?? "",
  );
  const assignmentsQuery = useJobAssignmentsQuery(organizationId, id);
  const activitiesQuery = useJobActivitiesQuery(organizationId, id);
  const techniciansQuery = useTechniciansQuery(organizationId);
  const membersQuery = useOrganizationMembersQuery(organizationId);
  const jobInvoicesQuery = useInvoicesQuery(organizationId, {
    jobId: id,
  });

  const scheduleMutation = useScheduleJobMutation(organizationId);
  const progressMutation = useUpdateJobProgressMutation(organizationId);
  const completeMutation = useCompleteJobMutation(organizationId);
  const cancelMutation = useCancelJobMutation(organizationId);
  const assignMutation = useAssignTechniciansMutation(organizationId);
  const reassignMutation = useReassignTechnicianMutation(organizationId);
  const updateAssignmentMutation =
    useUpdateJobAssignmentMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);

  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [scheduleLocation, setScheduleLocation] = useState("");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [completionSummary, setCompletionSummary] = useState("");
  const [completeNote, setCompleteNote] = useState("");
  const [technicianId, setTechnicianId] = useState<string | null>(null);

  const pending =
    scheduleMutation.isPending ||
    progressMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    assignMutation.isPending ||
    reassignMutation.isPending ||
    updateAssignmentMutation.isPending;

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

  const activeAssignments = assignmentsQuery.assignments.filter(
    (assignment) => assignment.status === "ASSIGNED",
  );
  const activeTechnicians = techniciansQuery.technicians.filter(
    (technician) => technician.status === "ACTIVE",
  );

  function resetFeedback() {
    setActionError(null);
    setActionSuccess(null);
  }

  function openScheduleDialog(current: Job) {
    setScheduledStart(toDatetimeLocalValue(current.scheduledStart));
    setScheduledEnd(toDatetimeLocalValue(current.scheduledEnd));
    setScheduleLocation(current.location ?? "");
    setAllowOverlap(false);
    setScheduleOpen(true);
  }

  async function submitSchedule() {
    if (!job) return;
    resetFeedback();
    if (!scheduledStart || !scheduledEnd) {
      setActionError("Scheduled start and end are required.");
      return;
    }
    const start = fromDatetimeLocalValue(scheduledStart);
    const end = fromDatetimeLocalValue(scheduledEnd);
    if (new Date(end) <= new Date(start)) {
      setActionError("Scheduled end must be after start.");
      return;
    }
    try {
      await scheduleMutation.mutateAsync({
        id,
        mode: job.status === "DRAFT" ? "schedule" : "reschedule",
        body: {
          scheduledStart: start,
          scheduledEnd: end,
          location: scheduleLocation.trim() || undefined,
          allowOverlap: allowOverlap || undefined,
        },
      });
      setScheduleOpen(false);
      setActionSuccess(
        job.status === "DRAFT"
          ? "Job scheduled and confirmed."
          : "Schedule updated.",
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && !allowOverlap) {
        setActionError(
          `${toUserErrorMessage(error, "Scheduling conflict detected.")} Enable allow overlap to submit anyway.`,
        );
      } else {
        setActionError(
          toUserErrorMessage(error, "Unable to save the schedule."),
        );
      }
    }
  }

  async function runPrimaryAction() {
    if (!job) return;
    resetFeedback();

    if (job.status === "DRAFT") {
      if (!isManager) return;
      openScheduleDialog(job);
      return;
    }

    if (job.status === "IN_PROGRESS") {
      setCompletionSummary("");
      setCompleteNote("");
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
        id,
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
    resetFeedback();
    if (!completionSummary.trim()) {
      setActionError("Completion summary is required.");
      return;
    }
    try {
      await completeMutation.mutateAsync({
        id,
        body: {
          completionSummary: completionSummary.trim(),
          note: completeNote.trim() || undefined,
        },
      });
      setCompleteOpen(false);
      setActionSuccess("Job completed.");
    } catch (error) {
      setActionError(toUserErrorMessage(error, "Unable to complete the job."));
    }
  }

  async function confirmCancel() {
    resetFeedback();
    try {
      await cancelMutation.mutateAsync(id);
      setCancelOpen(false);
      setActionSuccess("Job cancelled.");
    } catch (error) {
      setActionError(toUserErrorMessage(error, "Unable to cancel this job."));
    }
  }

  function requestAssign() {
    resetFeedback();
    if (!technicianId) {
      setActionError("Select a technician to assign.");
      return;
    }
    if (!job?.scheduledStart || !job.scheduledEnd) {
      setActionError("Schedule the job before assigning a technician.");
      return;
    }
    setAssignConfirmOpen(true);
  }

  async function submitAssign() {
    resetFeedback();
    if (!technicianId) {
      setActionError("Select a technician to assign.");
      return;
    }
    try {
      const active = activeAssignments[0];
      if (active) {
        await reassignMutation.mutateAsync({
          id,
          assignmentId: active.id,
          body: {
            technicianId,
            allowOverlap: allowOverlap || undefined,
          },
        });
        setActionSuccess("Technician reassigned.");
      } else {
        await assignMutation.mutateAsync({
          id,
          body: {
            technicianIds: [technicianId],
            allowOverlap: allowOverlap || undefined,
          },
        });
        setActionSuccess("Technician assigned.");
      }
      setAssignConfirmOpen(false);
      setAssignOpen(false);
      setTechnicianId(null);
      setAllowOverlap(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && !allowOverlap) {
        setActionError(
          `${toUserErrorMessage(error, "Assignment conflict detected.")} Enable allow overlap to submit anyway.`,
        );
      } else {
        setActionError(
          toUserErrorMessage(error, "Unable to update technician assignment."),
        );
      }
      setAssignConfirmOpen(false);
    }
  }

  async function releaseAssignment(assignmentId: string) {
    resetFeedback();
    try {
      await updateAssignmentMutation.mutateAsync({
        id,
        assignmentId,
        body: { status: "RELEASED" },
      });
      setActionSuccess("Technician released.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to release the assignment."),
      );
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Job" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Job" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isError || !job) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/jobs"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to list
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {detailQuery.server.error?.message ?? "Job not found."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void detailQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const customer = customerQuery.customer;
  const address = customer ? formatCustomerAddress(customer) : null;
  const serviceRequest = requestQuery.serviceRequest;
  const primaryLabel = isManager
    ? getPrimaryJobActionLabel(job.status)
    : getPrimaryExecutionActionLabel(job.status);
  const canCancel =
    isManager &&
    job.status !== "COMPLETED" &&
    job.status !== "CANCELLED";
  const canReschedule =
    isManager &&
    job.status !== "DRAFT" &&
    job.status !== "COMPLETED" &&
    job.status !== "CANCELLED";
  const canManageAssignment =
    isManager &&
    job.status !== "COMPLETED" &&
    job.status !== "CANCELLED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/jobs"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to list
        </Link>
        <PageHeader
          title={job.title}
          description={`Job ${shortId(job.id)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              {isTechnician ? (
                <Link
                  href={`/dashboard/my-work/${job.id}`}
                  className={buttonVariants()}
                >
                  Open execution
                </Link>
              ) : null}
              {primaryLabel ? (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => void runPrimaryAction()}
                >
                  {primaryLabel}
                </Button>
              ) : null}
              {canReschedule ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => openScheduleDialog(job)}
                >
                  Reschedule
                </Button>
              ) : null}
              {canManageAssignment ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setTechnicianId(null);
                    setAllowOverlap(false);
                    setAssignOpen(true);
                  }}
                >
                  {activeAssignments.length > 0
                    ? "Change technician"
                    : "Assign technician"}
                </Button>
              ) : null}
              {isManager ? (
                <Link
                  href="/dashboard/dispatch"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Open dispatch
                </Link>
              ) : null}
              {canCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel job
                </Button>
              ) : null}
            </div>
          }
        />
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

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        pending={scheduleMutation.isPending}
        scheduledStart={scheduledStart}
        scheduledEnd={scheduledEnd}
        location={scheduleLocation}
        allowOverlap={allowOverlap}
        onStartChange={setScheduledStart}
        onEndChange={setScheduledEnd}
        onLocationChange={setScheduleLocation}
        onAllowOverlapChange={setAllowOverlap}
        onSubmit={() => void submitSchedule()}
        isDraft={job.status === "DRAFT"}
      />

      <CompleteDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        pending={completeMutation.isPending}
        summary={completionSummary}
        note={completeNote}
        onSummaryChange={setCompletionSummary}
        onNoteChange={setCompleteNote}
        onSubmit={() => void submitComplete()}
      />

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        pending={assignMutation.isPending || reassignMutation.isPending}
        technicians={activeTechnicians.map((technician) => ({
          id: technician.id,
          label:
            technicianLabelById.get(technician.id) ?? technician.employeeCode,
        }))}
        value={technicianId}
        onValueChange={setTechnicianId}
        allowOverlap={allowOverlap}
        onAllowOverlapChange={setAllowOverlap}
        onSubmit={requestAssign}
        isReassign={activeAssignments.length > 0}
      />

      <Dialog
        open={assignConfirmOpen}
        onOpenChange={(open) => {
          if (assignMutation.isPending || reassignMutation.isPending) return;
          setAssignConfirmOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeAssignments.length > 0
                ? "Confirm reassignment"
                : "Confirm assignment"}
            </DialogTitle>
            <DialogDescription>
              {technicianId
                ? `${activeAssignments.length > 0 ? "Reassign" : "Assign"} ${technicianLabelById.get(technicianId) ?? "this technician"} to this job.`
                : "Confirm this change."}
              {allowOverlap ? " Overlap will be allowed." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignConfirmOpen(false)}
              disabled={assignMutation.isPending || reassignMutation.isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void submitAssign()}
              disabled={assignMutation.isPending || reassignMutation.isPending}
            >
              {assignMutation.isPending || reassignMutation.isPending
                ? "Saving…"
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (cancelMutation.isPending) return;
          setCancelOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this job?</DialogTitle>
            <DialogDescription>
              This marks the job as cancelled and releases active assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep job
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmCancel()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Job</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <JobStatusBadge status={job.status} />
            </Field>
            <Field label="Priority">
              <JobPriorityBadge priority={job.priority} />
            </Field>
            <Field label="Scheduled start">
              {formatDateTime(job.scheduledStart, timeZone)}
            </Field>
            <Field label="Scheduled end">
              {formatDateTime(job.scheduledEnd, timeZone)}
            </Field>
            <Field label="Location">{job.location ?? "—"}</Field>
            <Field label="Estimated duration">
              {job.estimatedDuration != null
                ? `${job.estimatedDuration} min`
                : "—"}
            </Field>
            <Field label="Created">
              {formatDateTime(job.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(job.updatedAt, timeZone)}
            </Field>
            {job.completedAt ? (
              <Field label="Completed">
                {formatDateTime(job.completedAt, timeZone)}
              </Field>
            ) : null}
          </dl>
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {job.description?.trim() || "No description provided."}
            </p>
          </div>
          {job.completionSummary ? (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground">
                Completion summary
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {job.completionSummary}
              </p>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            {customerQuery.server.isLoading ? (
              <div className="mt-4 h-24 animate-pulse rounded-md bg-muted" />
            ) : customer ? (
              <dl className="mt-4 flex flex-col gap-3">
                <Field label="Name">{customer.name}</Field>
                <Field label="Phone">{customer.phone}</Field>
                <Field label="Email">{customer.email ?? "—"}</Field>
                <Field label="Address">{address ?? "—"}</Field>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Customer {shortId(job.customerId)}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Service request
            </h2>
            {requestQuery.server.isLoading ? (
              <div className="mt-4 h-10 animate-pulse rounded-md bg-muted" />
            ) : serviceRequest ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  {serviceRequest.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shortId(serviceRequest.id)} · {serviceRequest.status}
                </p>
                <Link
                  href={`/dashboard/service-requests/${serviceRequest.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Open request
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Request {shortId(job.requestId)}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Billing</h2>
            {job.status !== "COMPLETED" ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Invoices can be created after this job is completed.
              </p>
            ) : jobInvoicesQuery.server.isLoading ? (
              <div className="mt-4 h-12 animate-pulse rounded-md bg-muted" />
            ) : jobInvoicesQuery.invoices.length > 0 ? (
              <ul className="mt-4 divide-y divide-border">
                {jobInvoicesQuery.invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(invoice.total, invoice.currency)} due{" "}
                        {formatMoney(invoice.amountDue, invoice.currency)}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={invoice.status} />
                  </li>
                ))}
              </ul>
            ) : canManageInvoices ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  No invoice for this completed job yet.
                </p>
                <Link
                  href={`/dashboard/invoices/new?jobId=${encodeURIComponent(job.id)}&customerId=${encodeURIComponent(job.customerId)}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Create invoice
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No invoice linked to this job.
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Technicians
          </h2>
        </div>
        {assignmentsQuery.server.isLoading ? (
          <div className="mt-4 h-10 animate-pulse rounded-md bg-muted" />
        ) : activeAssignments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No active technician assignment.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {activeAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {technicianLabelById.get(assignment.technicianId) ??
                      shortId(assignment.technicianId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {formatDateTime(assignment.assignedAt, timeZone)}
                  </p>
                </div>
                {canManageAssignment ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => void releaseAssignment(assignment.id)}
                  >
                    Release
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        {activitiesQuery.server.isLoading ? (
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : activitiesQuery.server.isError ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Activity history is unavailable for your role or this job.
          </p>
        ) : activitiesQuery.activities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No recorded activity for this job yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {activitiesQuery.activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {activityLabel(activity.action)}
                    {activity.fromStatus && activity.toStatus
                      ? ` (${JOB_STATUS_LABEL[activity.fromStatus as JobStatus]} → ${JOB_STATUS_LABEL[activity.toStatus as JobStatus]})`
                      : null}
                  </p>
                  {activity.message ? (
                    <p className="text-xs text-muted-foreground">
                      {activity.message}
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(activity.createdAt, timeZone)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="h-64 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  pending,
  scheduledStart,
  scheduledEnd,
  location,
  allowOverlap,
  onStartChange,
  onEndChange,
  onLocationChange,
  onAllowOverlapChange,
  onSubmit,
  isDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  location: string;
  allowOverlap: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onAllowOverlapChange: (value: boolean) => void;
  onSubmit: () => void;
  isDraft: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDraft ? "Schedule job" : "Reschedule job"}
          </DialogTitle>
          <DialogDescription>
            Set the scheduled window
            {isDraft ? ". Draft jobs become confirmed when scheduled." : "."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-scheduled-start">Start</Label>
            <Input
              id="job-scheduled-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(event) => onStartChange(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-scheduled-end">End</Label>
            <Input
              id="job-scheduled-end"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(event) => onEndChange(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-schedule-location">Location</Label>
            <Input
              id="job-schedule-location"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              maxLength={500}
              disabled={pending}
              placeholder="Optional"
            />
          </div>
          <Label className="flex cursor-pointer items-center gap-2 font-normal">
            <Checkbox
              checked={allowOverlap}
              onCheckedChange={(checked) =>
                onAllowOverlapChange(checked === true)
              }
              disabled={pending}
            />
            Allow schedule overlap
          </Label>
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
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? "Saving…" : isDraft ? "Schedule" : "Save schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({
  open,
  onOpenChange,
  pending,
  summary,
  note,
  onSummaryChange,
  onNoteChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  summary: string;
  note: string;
  onSummaryChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete job</DialogTitle>
          <DialogDescription>
            Provide a completion summary before marking the job complete.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-completion-summary">Completion summary</Label>
            <Textarea
              id="job-completion-summary"
              value={summary}
              onChange={(event) => onSummaryChange(event.target.value)}
              maxLength={5000}
              rows={4}
              disabled={pending}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-completion-note">Note</Label>
            <Textarea
              id="job-completion-note"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              maxLength={5000}
              rows={2}
              disabled={pending}
              placeholder="Optional"
            />
          </div>
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
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? "Completing…" : "Complete job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  pending,
  technicians,
  value,
  onValueChange,
  allowOverlap,
  onAllowOverlapChange,
  onSubmit,
  isReassign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  technicians: { id: string; label: string }[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  allowOverlap: boolean;
  onAllowOverlapChange: (value: boolean) => void;
  onSubmit: () => void;
  isReassign: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReassign ? "Change technician" : "Assign technician"}
          </DialogTitle>
          <DialogDescription>
            Choose an active technician in this organization. You will confirm
            before the assignment is saved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-assign-technician">Technician</Label>
            <Select
              value={value}
              onValueChange={(next) => onValueChange(next)}
              disabled={pending}
            >
              <SelectTrigger id="job-assign-technician" className="w-full">
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {technicians.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active technicians available.
              </p>
            ) : null}
          </div>
          <Label className="flex cursor-pointer items-center gap-2 font-normal">
            <Checkbox
              checked={allowOverlap}
              onCheckedChange={(checked) =>
                onAllowOverlapChange(checked === true)
              }
              disabled={pending}
            />
            Allow schedule overlap
          </Label>
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
          <Button type="button" onClick={onSubmit} disabled={pending}>
            Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
