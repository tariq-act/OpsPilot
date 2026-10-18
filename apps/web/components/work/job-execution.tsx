"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { LuArrowLeft, LuMapPin, LuPhone } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { JobPriorityBadge, JobStatusBadge } from "@/components/jobs/job-badges";
import { useOrg } from "@/components/providers/org-provider";
import { JobActivityTimeline } from "@/components/work/job-activity-timeline";
import { JobPhotos } from "@/components/work/job-photos";
import { JobWorkNotes } from "@/components/work/job-work-notes";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCustomerAddress,
  formatDateTime,
  shortId,
} from "@/lib/format";
import {
  getNextExecutionProgressStatus,
  getPrimaryExecutionActionLabel,
  JOB_STATUS_LABEL,
} from "@/lib/job-status";
import { useCustomerQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useCompleteJobMutation,
  useJobExecutionQuery,
  useUpdateJobProgressMutation,
} from "@/lib/query/jobs";
import { useOrganizationMembersQuery } from "@/lib/query/organizations";
import { useServiceRequestQuery } from "@/lib/query/service-requests";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

export function JobExecution({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";

  const executionQuery = useJobExecutionQuery(organizationId, id);
  const job = executionQuery.job;

  const customerQuery = useCustomerQuery(
    organizationId,
    job?.customerId ?? "",
  );
  const requestQuery = useServiceRequestQuery(
    organizationId,
    job?.requestId ?? "",
  );
  const membersQuery = useOrganizationMembersQuery(organizationId);

  const progressMutation = useUpdateJobProgressMutation(organizationId);
  const completeMutation = useCompleteJobMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [progressConfirmOpen, setProgressConfirmOpen] = useState(false);
  const [progressNote, setProgressNote] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState("");
  const [completeNote, setCompleteNote] = useState("");

  const actorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of membersQuery.members) {
      map.set(member.userId, member.userName);
    }
    return map;
  }, [membersQuery.members]);

  const pending = progressMutation.isPending || completeMutation.isPending;
  const nextProgress = job
    ? getNextExecutionProgressStatus(job.status)
    : null;
  const primaryLabel = job
    ? getPrimaryExecutionActionLabel(job.status)
    : null;
  const canExecute =
    job != null &&
    job.status !== "COMPLETED" &&
    job.status !== "CANCELLED" &&
    job.status !== "DRAFT";

  function resetFeedback() {
    setActionError(null);
    setActionSuccess(null);
  }

  function openPrimaryAction() {
    if (!job) return;
    resetFeedback();
    if (job.status === "IN_PROGRESS") {
      setCompletionSummary("");
      setCompleteNote("");
      setCompleteOpen(true);
      return;
    }
    if (nextProgress) {
      setProgressNote("");
      setProgressConfirmOpen(true);
    }
  }

  async function confirmProgress() {
    if (!job || !nextProgress) return;
    resetFeedback();
    try {
      await progressMutation.mutateAsync({
        id,
        body: {
          status: nextProgress,
          note: progressNote.trim() || undefined,
        },
      });
      setProgressConfirmOpen(false);
      setActionSuccess(
        `Status updated to ${JOB_STATUS_LABEL[nextProgress]}.`,
      );
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to update job progress."),
      );
      setProgressConfirmOpen(false);
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

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Job" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (executionQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Job" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (executionQuery.server.isError || !job) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/my-work"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to my work
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {executionQuery.server.error?.message ??
              "This job is not available for execution."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => void executionQuery.refetch()}
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
  const location = job.location ?? address;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <Link
          href="/dashboard/my-work"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to my work
        </Link>
        <PageHeader
          title={job.title}
          description={`Job ${shortId(job.id)}`}
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

      {job.status === "DRAFT" ? (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This job is still a draft. A dispatcher must schedule it before you
          can start field work.
        </p>
      ) : null}

      {job.status === "COMPLETED" || job.status === "CANCELLED" ? (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This job is {JOB_STATUS_LABEL[job.status as JobStatus].toLowerCase()}.
          Execution actions are closed.
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <JobStatusBadge status={job.status} />
            <JobPriorityBadge priority={job.priority} />
          </div>
          {primaryLabel && canExecute ? (
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={openPrimaryAction}
            >
              {primaryLabel}
            </Button>
          ) : null}
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Scheduled">
            {formatDateTime(job.scheduledStart, timeZone)}
            {job.scheduledEnd
              ? ` – ${formatDateTime(job.scheduledEnd, timeZone)}`
              : ""}
          </Field>
          <Field label="Location">
            <span className="inline-flex items-start gap-1.5">
              <LuMapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {location ?? "—"}
            </span>
          </Field>
          <Field label="Customer">
            {customerQuery.server.isLoading
              ? "…"
              : (customer?.name ?? shortId(job.customerId))}
          </Field>
          <Field label="Phone">
            {customer?.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <LuPhone className="size-3.5" aria-hidden />
                {customer.phone}
              </a>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Service request">
            {requestQuery.server.isLoading
              ? "…"
              : (serviceRequest?.title ?? shortId(job.requestId))}
          </Field>
          <Field label="Address">{address ?? "—"}</Field>
        </dl>

        {job.description ? (
          <div className="mt-5">
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {job.description}
            </p>
          </div>
        ) : null}

        {job.completionSummary ? (
          <div className="mt-5">
            <p className="text-xs font-medium text-muted-foreground">
              Completion summary
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {job.completionSummary}
            </p>
          </div>
        ) : null}
      </section>

      <JobWorkNotes
        organizationId={organizationId}
        jobId={id}
        notes={executionQuery.notes}
        timeZone={timeZone}
        authorNameById={actorNameById}
        canAdd={canExecute}
        isLoading={executionQuery.server.isLoading}
        isError={executionQuery.server.isError}
        errorMessage={executionQuery.server.error?.message}
        onRetry={() => void executionQuery.refetch()}
      />

      <JobPhotos
        organizationId={organizationId}
        jobId={id}
        photos={executionQuery.photos}
        timeZone={timeZone}
        canUpload={canExecute}
        isLoading={executionQuery.server.isLoading}
        isError={executionQuery.server.isError}
        errorMessage={executionQuery.server.error?.message}
        onRetry={() => void executionQuery.refetch()}
      />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <div className="mt-4">
          <JobActivityTimeline
            activities={executionQuery.activities}
            timeZone={timeZone}
            actorNameById={actorNameById}
            isLoading={executionQuery.server.isLoading}
            isError={executionQuery.server.isError}
            errorMessage={executionQuery.server.error?.message}
          />
        </div>
      </section>

      {primaryLabel && canExecute ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={openPrimaryAction}
          >
            {primaryLabel}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={progressConfirmOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setProgressConfirmOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{primaryLabel ?? "Update status"}</DialogTitle>
            <DialogDescription>
              {nextProgress
                ? `Move this job to ${JOB_STATUS_LABEL[nextProgress]}.`
                : "Confirm this status update."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="execution-progress-note">Note</Label>
            <Textarea
              id="execution-progress-note"
              value={progressNote}
              onChange={(event) => setProgressNote(event.target.value)}
              maxLength={5000}
              rows={3}
              disabled={pending}
              placeholder="Optional"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProgressConfirmOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmProgress()}
              disabled={pending}
            >
              {pending ? "Updating…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={completeOpen}
        onOpenChange={(open) => {
          if (completeMutation.isPending) return;
          setCompleteOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete job</DialogTitle>
            <DialogDescription>
              Provide a completion summary. An optional note is stored with the
              job activity.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="execution-complete-summary">
                Completion summary
              </Label>
              <Textarea
                id="execution-complete-summary"
                value={completionSummary}
                onChange={(event) => setCompletionSummary(event.target.value)}
                maxLength={5000}
                rows={4}
                disabled={completeMutation.isPending}
                required
                placeholder="What was done to resolve the job?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="execution-complete-note">Additional note</Label>
              <Textarea
                id="execution-complete-note"
                value={completeNote}
                onChange={(event) => setCompleteNote(event.target.value)}
                maxLength={5000}
                rows={2}
                disabled={completeMutation.isPending}
                placeholder="Optional"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Attach before/after photos in the Photos section before completing
              if needed. The API only requires a completion summary.
            </p>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
