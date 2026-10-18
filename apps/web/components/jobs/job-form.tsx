"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
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
import { shortId } from "@/lib/format";
import { JOB_PRIORITY_LABEL } from "@/lib/job-status";
import { useCustomersQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useCreateJobMutation } from "@/lib/query/jobs";
import { useServiceRequestsQuery } from "@/lib/query/service-requests";
import type { CreateJobInput, JobPriority } from "@/lib/types";

const PRIORITIES: JobPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type FormErrors = Partial<Record<keyof CreateJobInput, string>>;

function validate(input: CreateJobInput): FormErrors {
  const errors: FormErrors = {};
  if (!input.customerId.trim()) {
    errors.customerId = "Customer is required.";
  }
  if (!input.requestId.trim()) {
    errors.requestId = "Service request is required.";
  }
  if (input.title && input.title.trim().length > 200) {
    errors.title = "Title must be at most 200 characters.";
  }
  if (input.description && input.description.length > 5000) {
    errors.description = "Description must be at most 5000 characters.";
  }
  if (input.location && input.location.length > 500) {
    errors.location = "Location must be at most 500 characters.";
  }
  if (
    input.estimatedDuration !== undefined &&
    (input.estimatedDuration < 1 || input.estimatedDuration > 10080)
  ) {
    errors.estimatedDuration =
      "Estimated duration must be between 1 and 10080 minutes.";
  }
  return errors;
}

type JobCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from a service request (e.g. SR detail → create job). */
  defaultRequestId?: string;
  defaultCustomerId?: string;
};

export function JobCreateDialog({
  open,
  onOpenChange,
  defaultRequestId,
  defaultCustomerId,
}: JobCreateDialogProps) {
  const { current } = useOrg();
  const router = useRouter();
  const organizationId = current?.id ?? "";

  const customersQuery = useCustomersQuery(organizationId);
  const requestsQuery = useServiceRequestsQuery(organizationId, {
    status: "ACCEPTED",
  });
  const createMutation = useCreateJobMutation(organizationId);

  const [customerId, setCustomerId] = useState<string | null>(
    defaultCustomerId ?? null,
  );
  const [requestId, setRequestId] = useState<string | null>(
    defaultRequestId ?? null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<JobPriority>("MEDIUM");
  const [location, setLocation] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeCustomers = customersQuery.customers.filter(
    (customer) => customer.status === "ACTIVE",
  );

  const acceptedRequests = useMemo(() => {
    const requests = requestsQuery.serviceRequests;
    if (!customerId) return requests;
    return requests.filter((request) => request.customerId === customerId);
  }, [requestsQuery.serviceRequests, customerId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const durationValue = estimatedDuration.trim()
      ? Number(estimatedDuration.trim())
      : undefined;

    const input: CreateJobInput = {
      customerId: customerId ?? "",
      requestId: requestId ?? "",
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      priority,
      location: location.trim() || undefined,
      estimatedDuration:
        durationValue !== undefined && !Number.isNaN(durationValue)
          ? durationValue
          : undefined,
    };

    const nextErrors = validate(input);
    if (
      estimatedDuration.trim() &&
      (durationValue === undefined || Number.isNaN(durationValue))
    ) {
      nextErrors.estimatedDuration = "Estimated duration must be a number.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const result = await createMutation.mutateAsync(input);
      onOpenChange(false);
      router.push(`/dashboard/jobs/${result.job.id}`);
    } catch (error) {
      setSubmitError(toUserErrorMessage(error, "Unable to create the job."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
          <DialogDescription>
            Create a job from an accepted service request in this organization.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-job-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-customer">Customer</Label>
            <Select
              value={customerId}
              onValueChange={(value) => {
                setCustomerId(value);
                setRequestId(null);
              }}
              disabled={
                customersQuery.server.isLoading || createMutation.isPending
              }
            >
              <SelectTrigger
                id="job-customer"
                className="w-full"
                aria-invalid={Boolean(errors.customerId)}
              >
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {activeCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId ? (
              <p className="text-xs text-destructive">{errors.customerId}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="job-request">Service request</Label>
            <Select
              value={requestId}
              onValueChange={(value) => {
                setRequestId(value);
                const selected = acceptedRequests.find(
                  (request) => request.id === value,
                );
                if (selected) {
                  setCustomerId(selected.customerId);
                  if (!title.trim()) setTitle(selected.title);
                  if (!description.trim() && selected.description) {
                    setDescription(selected.description);
                  }
                  setPriority(selected.priority);
                }
              }}
              disabled={
                requestsQuery.server.isLoading || createMutation.isPending
              }
            >
              <SelectTrigger
                id="job-request"
                className="w-full"
                aria-invalid={Boolean(errors.requestId)}
              >
                <SelectValue placeholder="Select an accepted request" />
              </SelectTrigger>
              <SelectContent>
                {acceptedRequests.map((request) => (
                  <SelectItem key={request.id} value={request.id}>
                    {request.title} ({shortId(request.id)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.requestId ? (
              <p className="text-xs text-destructive">{errors.requestId}</p>
            ) : null}
            {requestsQuery.server.isSuccess &&
            acceptedRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No accepted service requests available
                {customerId ? " for this customer" : ""}. Accept a request
                first.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="job-title">Title</Label>
            <Input
              id="job-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.title)}
              placeholder="Optional — defaults from the service request"
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="job-description">Description</Label>
            <Textarea
              id="job-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={3}
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="job-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => {
                  if (value) setPriority(value as JobPriority);
                }}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="job-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {JOB_PRIORITY_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="job-duration">Estimated duration (min)</Label>
              <Input
                id="job-duration"
                type="number"
                min={1}
                max={10080}
                value={estimatedDuration}
                onChange={(event) => setEstimatedDuration(event.target.value)}
                disabled={createMutation.isPending}
                aria-invalid={Boolean(errors.estimatedDuration)}
                placeholder="Optional"
              />
              {errors.estimatedDuration ? (
                <p className="text-xs text-destructive">
                  {errors.estimatedDuration}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="job-location">Location</Label>
            <Input
              id="job-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={500}
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.location)}
              placeholder="Optional site address or notes"
            />
            {errors.location ? (
              <p className="text-xs text-destructive">{errors.location}</p>
            ) : null}
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
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
            form="create-job-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
