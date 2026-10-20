"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  FollowUpStatusBadge,
  FollowUpTypeBadge,
} from "@/components/follow-ups/follow-up-badges";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  canCancelFollowUp,
  canCompleteFollowUp,
  canEditFollowUp,
} from "@/lib/follow-up-labels";
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import { isFollowUpManagerRole } from "@/lib/member-roles";
import { useCustomerQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useFollowUpQuery,
  useUpdateFollowUpMutation,
} from "@/lib/query/follow-ups";
import { useJobQuery } from "@/lib/query/jobs";
import { cn } from "@/lib/utils";

export function FollowUpDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isFollowUpManagerRole(current?.role);

  const detailQuery = useFollowUpQuery(organizationId, id);
  const followUp = detailQuery.followUp;
  const customerQuery = useCustomerQuery(
    organizationId,
    followUp?.customerId ?? "",
  );
  const jobQuery = useJobQuery(organizationId, followUp?.jobId ?? "");
  const updateMutation = useUpdateFollowUpMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDueAt, setEditDueAt] = useState<Date | undefined>(undefined);
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const pending = updateMutation.isPending;

  function openEdit() {
    if (!followUp) return;
    setEditDueAt(new Date(followUp.dueAt));
    setEditNotes(followUp.notes ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function confirmComplete() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateMutation.mutateAsync({
        id,
        body: { status: "COMPLETED" },
      });
      setCompleteOpen(false);
      setActionSuccess("Follow-up marked completed.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to complete this follow-up."),
      );
      setCompleteOpen(false);
    }
  }

  async function confirmCancel() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateMutation.mutateAsync({
        id,
        body: { status: "CANCELLED" },
      });
      setCancelOpen(false);
      setActionSuccess("Follow-up cancelled.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to cancel this follow-up."),
      );
      setCancelOpen(false);
    }
  }

  async function saveEdit() {
    setEditError(null);
    if (!editDueAt) {
      setEditError("Due date is required.");
      return;
    }
    if (editNotes.length > 2000) {
      setEditError("Notes must be at most 2000 characters.");
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateMutation.mutateAsync({
        id,
        body: {
          dueAt: editDueAt.toISOString(),
          notes: editNotes.trim() ? editNotes.trim() : null,
        },
      });
      setEditOpen(false);
      setActionSuccess("Follow-up updated.");
    } catch (error) {
      setEditError(
        toUserErrorMessage(error, "Unable to update this follow-up."),
      );
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Follow-up" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Follow-up" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can manage follow-ups.
        </p>
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Follow-up" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.server.isError || !followUp) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/follow-ups"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to follow-ups
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {detailQuery.server.error?.message ?? "Follow-up not found."}
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
  const job = jobQuery.job;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/follow-ups"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to follow-ups
        </Link>
        <PageHeader
          title={`${shortId(followUp.id)} follow-up`}
          description="Customer follow-up details and actions."
          actions={
            <div className="flex flex-wrap gap-2">
              {canEditFollowUp(followUp.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={openEdit}
                >
                  Edit
                </Button>
              ) : null}
              {canCompleteFollowUp(followUp.status) ? (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => setCompleteOpen(true)}
                >
                  Complete
                </Button>
              ) : null}
              {canCancelFollowUp(followUp.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel
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

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <FollowUpStatusBadge status={followUp.status} />
            <FollowUpTypeBadge type={followUp.type} />
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Due date">
              {formatDate(followUp.dueAt, timeZone)}
            </Field>
            <Field label="Created">
              {formatDateTime(followUp.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(followUp.updatedAt, timeZone)}
            </Field>
            <Field label="Created by">
              <span className="font-mono text-xs">{followUp.createdBy}</span>
            </Field>
          </dl>
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {followUp.notes ?? "—"}
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            {customerQuery.server.isLoading ? (
              <div className="mt-4 h-12 animate-pulse rounded-md bg-muted" />
            ) : customer ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  {customer.name}
                </p>
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Open customer
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {shortId(followUp.customerId)}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Job</h2>
            {!followUp.jobId ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No related job.
              </p>
            ) : jobQuery.server.isLoading ? (
              <div className="mt-4 h-12 animate-pulse rounded-md bg-muted" />
            ) : job ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  {job.title}
                </p>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Open job
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {shortId(followUp.jobId)}
              </p>
            )}
          </section>
        </div>
      </div>

      <Dialog
        open={completeOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setCompleteOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete this follow-up?</DialogTitle>
            <DialogDescription>
              Marks the follow-up as completed. This cannot be undone from the
              UI except by editing status again if the API allows it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompleteOpen(false)}
              disabled={pending}
            >
              Keep open
            </Button>
            <Button
              type="button"
              onClick={() => void confirmComplete()}
              disabled={pending}
            >
              {pending ? "Saving…" : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setCancelOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this follow-up?</DialogTitle>
            <DialogDescription>
              Sets status to cancelled. The record is kept for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={pending}
            >
              Keep open
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmCancel()}
              disabled={pending}
            >
              {pending ? "Cancelling…" : "Cancel follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setEditOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit follow-up</DialogTitle>
            <DialogDescription>
              Update due date and notes. Status changes use Complete or Cancel.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Due date</Label>
              <DatePicker
                value={editDueAt}
                onChange={setEditDueAt}
                placeholder="Select due date"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-follow-up-notes">Notes</Label>
              <Textarea
                id="edit-follow-up-notes"
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={4}
                maxLength={2000}
              />
            </div>
            {editError ? (
              <p role="alert" className="text-sm text-destructive">
                {editError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={pending}
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => void saveEdit()}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save changes"}
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
