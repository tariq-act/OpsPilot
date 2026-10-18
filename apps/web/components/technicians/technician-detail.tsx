"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import { JobStatusBadge } from "@/components/jobs/job-badges";
import { useOrg } from "@/components/providers/org-provider";
import { TechnicianStatusBadge } from "@/components/technicians/technician-badges";
import { TechnicianEditDialog } from "@/components/technicians/technician-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useJobsQuery } from "@/lib/query/jobs";
import { useOrganizationMembersQuery } from "@/lib/query/organizations";
import {
  useDeactivateTechnicianMutation,
  useTechnicianQuery,
} from "@/lib/query/technicians";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

const OPEN_JOB_STATUSES = new Set<JobStatus>([
  "DRAFT",
  "CONFIRMED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
]);

export function TechnicianDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";

  const detailQuery = useTechnicianQuery(organizationId, id);
  const technician = detailQuery.technician;

  const membersQuery = useOrganizationMembersQuery(organizationId);
  const jobsQuery = useJobsQuery(organizationId, { technicianId: id });
  const deactivateMutation = useDeactivateTechnicianMutation(organizationId);

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const member = useMemo(() => {
    if (!technician) return null;
    return (
      membersQuery.members.find((row) => row.userId === technician.userId) ??
      null
    );
  }, [membersQuery.members, technician]);

  const assignedJobs = useMemo(() => {
    return jobsQuery.jobs.filter((job) => OPEN_JOB_STATUSES.has(job.status));
  }, [jobsQuery.jobs]);

  const jobHistory = useMemo(() => {
    return jobsQuery.jobs.filter((job) => !OPEN_JOB_STATUSES.has(job.status));
  }, [jobsQuery.jobs]);

  async function confirmDeactivate() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await deactivateMutation.mutateAsync(id);
      setDeactivateOpen(false);
      setActionSuccess("Technician deactivated.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to deactivate this technician."),
      );
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Technician" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Technician" />
        <DetailSkeleton />
      </div>
    );
  }

  if (detailQuery.server.isError || !technician) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/technicians"
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
            {detailQuery.server.error?.message ?? "Technician not found."}
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

  const displayName = member?.userName ?? shortId(technician.userId);
  const canDeactivate = technician.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/technicians"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to list
        </Link>
        <PageHeader
          title={displayName}
          description={`Technician ${technician.employeeCode}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
                disabled={deactivateMutation.isPending}
              >
                Edit
              </Button>
              {canDeactivate ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeactivateOpen(true)}
                  disabled={deactivateMutation.isPending}
                >
                  Deactivate
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

      <TechnicianEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        technician={technician}
        onSaved={() => setActionSuccess("Technician updated.")}
      />

      <Dialog
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (deactivateMutation.isPending) return;
          setDeactivateOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate this technician?</DialogTitle>
            <DialogDescription>
              This sets the technician status to inactive. The profile is kept
              for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateOpen(false)}
              disabled={deactivateMutation.isPending}
            >
              Keep active
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeactivate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending
                ? "Deactivating…"
                : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <TechnicianStatusBadge status={technician.status} />
            </Field>
            <Field label="Employee code">{technician.employeeCode}</Field>
            <Field label="Hire date">
              {formatDate(technician.hireDate, timeZone)}
            </Field>
            <Field label="Created">
              {formatDateTime(technician.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(technician.updatedAt, timeZone)}
            </Field>
            <Field label="Technician ID">
              <span className="font-mono text-xs">{technician.id}</span>
            </Field>
          </dl>
          {technician.bio ? (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground">Bio</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {technician.bio}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Contact</h2>
          <dl className="mt-4 flex flex-col gap-3">
            <Field label="Name">{displayName}</Field>
            <Field label="Email">{member?.userEmail ?? "—"}</Field>
            <Field label="Phone">{technician.phone ?? "—"}</Field>
            <Field label="Member role">{member?.role ?? "—"}</Field>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Workload</h2>
          <p className="text-xs text-muted-foreground">
            {assignedJobs.length} open · {jobHistory.length} closed
          </p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Open jobs are active assignments. Assign or reassign technicians from
          a job detail page.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Assigned jobs
          </h2>
          <Link
            href={`/dashboard/jobs?technicianId=${encodeURIComponent(id)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View in jobs
          </Link>
        </div>
        {jobsQuery.server.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
        ) : assignedJobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No open assigned jobs.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {assignedJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {shortId(job.id)} ·{" "}
                    {formatDateTime(job.scheduledStart, timeZone)}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Job history</h2>
        {jobsQuery.server.isLoading ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" />
        ) : jobHistory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No completed or cancelled jobs yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {jobHistory.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {shortId(job.id)} ·{" "}
                    {formatDateTime(job.updatedAt, timeZone)}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
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
