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
import { useCustomersQuery } from "@/lib/query/customers";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useCreateServiceRequestMutation } from "@/lib/query/service-requests";
import {
  SERVICE_REQUEST_PRIORITY_LABEL,
  SERVICE_REQUEST_SOURCE_LABEL,
} from "@/lib/service-request-status";
import type {
  CreateServiceRequestInput,
  ServiceRequestPriority,
  ServiceRequestSource,
} from "@/lib/types";

const PRIORITIES: ServiceRequestPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const SOURCES: ServiceRequestSource[] = [
  "PHONE",
  "EMAIL",
  "WEBSITE",
  "WALK_IN",
  "WHATSAPP",
  "OTHER",
];

type FormErrors = Partial<Record<keyof CreateServiceRequestInput, string>>;

function validate(input: CreateServiceRequestInput): FormErrors {
  const errors: FormErrors = {};
  if (!input.customerId.trim()) {
    errors.customerId = "Customer is required.";
  }
  if (!input.title.trim()) {
    errors.title = "Title is required.";
  } else if (input.title.trim().length > 200) {
    errors.title = "Title must be at most 200 characters.";
  }
  if (input.description && input.description.length > 5000) {
    errors.description = "Description must be at most 5000 characters.";
  }
  if (input.preferredTime && input.preferredTime.length > 64) {
    errors.preferredTime = "Preferred time must be at most 64 characters.";
  }
  return errors;
}

function toUtcIsoDate(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
}

type ServiceRequestCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ServiceRequestCreateDialog({
  open,
  onOpenChange,
}: ServiceRequestCreateDialogProps) {
  const { current } = useOrg();
  const router = useRouter();
  const organizationId = current?.id ?? "";

  const customersQuery = useCustomersQuery(organizationId);
  const createMutation = useCreateServiceRequestMutation(organizationId);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ServiceRequestPriority>("MEDIUM");
  const [source, setSource] = useState<ServiceRequestSource>("PHONE");
  const [preferredDate, setPreferredDate] = useState<Date | undefined>();
  const [preferredTime, setPreferredTime] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeCustomers = customersQuery.customers.filter(
    (customer) => customer.status === "ACTIVE",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const input: CreateServiceRequestInput = {
      customerId: customerId ?? "",
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      source,
      preferredDate: preferredDate ? toUtcIsoDate(preferredDate) : undefined,
      preferredTime: preferredTime.trim() || undefined,
    };

    const nextErrors = validate(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const result = await createMutation.mutateAsync(input);
      onOpenChange(false);
      router.push(`/dashboard/service-requests/${result.serviceRequest.id}`);
    } catch (error) {
      setSubmitError(
        toUserErrorMessage(error, "Unable to create the service request."),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>New Service Request</DialogTitle>
          <DialogDescription>
            Capture intake for an active customer in this organization.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-service-request-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="sr-customer">Customer</Label>
            <Select
              value={customerId}
              onValueChange={(value) => setCustomerId(value)}
              disabled={
                customersQuery.server.isLoading || createMutation.isPending
              }
            >
              <SelectTrigger
                id="sr-customer"
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
            {customersQuery.server.isSuccess && activeCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active customers yet. Add a customer before creating a
                request.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sr-title">Title</Label>
            <Input
              id="sr-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.title)}
              placeholder="AC not cooling"
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sr-description">Description</Label>
            <Textarea
              id="sr-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={4}
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.description)}
              placeholder="Optional details from the customer"
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sr-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => {
                  if (value) setPriority(value as ServiceRequestPriority);
                }}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="sr-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SERVICE_REQUEST_PRIORITY_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sr-source">Source</Label>
              <Select
                value={source}
                onValueChange={(value) => {
                  if (value) setSource(value as ServiceRequestSource);
                }}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="sr-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SERVICE_REQUEST_SOURCE_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sr-preferred-date">Preferred date</Label>
              <DatePicker
                id="sr-preferred-date"
                value={preferredDate}
                onChange={setPreferredDate}
                placeholder="Pick preferred date"
                disabled={createMutation.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sr-preferred-time">Preferred time</Label>
              <Input
                id="sr-preferred-time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                maxLength={64}
                placeholder="Morning / 2–4pm"
                disabled={createMutation.isPending}
                aria-invalid={Boolean(errors.preferredTime)}
              />
              {errors.preferredTime ? (
                <p className="text-xs text-destructive">
                  {errors.preferredTime}
                </p>
              ) : null}
            </div>
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
            form="create-service-request-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
