"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOW_UP_TYPES,
  FOLLOW_UP_TYPE_LABEL,
} from "@/lib/follow-up-labels";
import { shortId } from "@/lib/format";
import { useCustomersQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useCreateFollowUpMutation } from "@/lib/query/follow-ups";
import { useJobsQuery } from "@/lib/query/jobs";
import type { FollowUpType, Job } from "@/lib/types";

type FollowUpCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: string;
  defaultJobId?: string;
};

export function FollowUpCreateDialog({
  open,
  onOpenChange,
  defaultCustomerId,
  defaultJobId,
}: FollowUpCreateDialogProps) {
  const { current } = useOrg();
  const router = useRouter();
  const organizationId = current?.id ?? "";

  const customersQuery = useCustomersQuery(organizationId);
  const jobsQuery = useJobsQuery(organizationId);
  const createMutation = useCreateFollowUpMutation(organizationId);

  const [customerId, setCustomerId] = useState<string | null>(
    defaultCustomerId ?? null,
  );
  const [jobId, setJobId] = useState<string | null>(defaultJobId ?? null);
  const [type, setType] = useState<FollowUpType>("FEEDBACK");
  const [dueAt, setDueAt] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const jobsForCustomer: Job[] = customerId
    ? jobsQuery.jobs.filter((job) => job.customerId === customerId)
    : jobsQuery.jobs;

  function onCustomerChange(nextCustomerId: string | null) {
    setCustomerId(nextCustomerId);
    if (jobId) {
      const job = jobsQuery.jobs.find((row) => row.id === jobId);
      if (job && nextCustomerId && job.customerId !== nextCustomerId) {
        setJobId(null);
      }
    }
  }

  function onJobChange(nextJobId: string | null) {
    setJobId(nextJobId);
    const job = jobsQuery.jobs.find((row) => row.id === nextJobId);
    if (job) setCustomerId(job.customerId);
  }

  function validate(): string | null {
    if (!customerId) return "Select a customer.";
    if (!type) return "Select a follow-up type.";
    if (!dueAt) return "Select a due date.";
    if (notes.length > 2000) return "Notes must be at most 2000 characters.";
    if (jobId) {
      const job = jobsQuery.jobs.find((row) => row.id === jobId);
      if (!job) return "Selected job was not found.";
      if (job.customerId !== customerId) {
        return "Customer must match the selected job.";
      }
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!customerId || !dueAt) return;

    try {
      const result = await createMutation.mutateAsync({
        customerId,
        jobId: jobId || undefined,
        type,
        dueAt: dueAt.toISOString(),
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
      router.push(`/dashboard/follow-ups/${result.followUp.id}`);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to create the follow-up."));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (createMutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Create follow-up</DialogTitle>
          <DialogDescription>
            Schedule feedback or a maintenance reminder for a customer.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-follow-up-form"
          className="flex flex-col gap-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select
              value={customerId}
              onValueChange={(value) => onCustomerChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customersQuery.customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Related job (optional)</Label>
            <Select
              value={jobId}
              onValueChange={(value) => onJobChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No related job" />
              </SelectTrigger>
              <SelectContent>
                {jobsForCustomer.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} ({shortId(job.id)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType((value as FollowUpType) ?? "FEEDBACK")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {FOLLOW_UP_TYPE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Due date</Label>
            <DatePicker
              value={dueAt}
              onChange={setDueAt}
              placeholder="Select due date"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="follow-up-notes">Notes (optional)</Label>
            <Textarea
              id="follow-up-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Context for the follow-up"
              disabled={createMutation.isPending}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-follow-up-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
