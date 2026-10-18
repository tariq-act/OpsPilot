"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "@/lib/query/customers";
import type {
  CreateCustomerInput,
  Customer,
  UpdateCustomerInput,
} from "@/lib/types";

type FormErrors = Partial<Record<keyof CreateCustomerInput, string>>;

function validateCreate(input: CreateCustomerInput): FormErrors {
  const errors: FormErrors = {};
  if (!input.name.trim()) {
    errors.name = "Name is required.";
  } else if (input.name.trim().length > 200) {
    errors.name = "Name must be at most 200 characters.";
  }
  if (!input.phone.trim()) {
    errors.phone = "Phone is required.";
  } else if (input.phone.trim().length > 32) {
    errors.phone = "Phone must be at most 32 characters.";
  }
  if (input.email) {
    if (input.email.length > 255) {
      errors.email = "Email must be at most 255 characters.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      errors.email = "Email must be a valid email address.";
    }
  }
  if (input.address && input.address.length > 500) {
    errors.address = "Address must be at most 500 characters.";
  }
  if (input.city && input.city.length > 100) {
    errors.city = "City must be at most 100 characters.";
  }
  if (input.state && input.state.length > 100) {
    errors.state = "State must be at most 100 characters.";
  }
  if (input.postalCode && input.postalCode.length > 32) {
    errors.postalCode = "Postal code must be at most 32 characters.";
  }
  if (input.notes && input.notes.length > 2000) {
    errors.notes = "Notes must be at most 2000 characters.";
  }
  return errors;
}

type CustomerFields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
};

function fieldsFromCustomer(customer?: Customer | null): CustomerFields {
  return {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    postalCode: customer?.postalCode ?? "",
    notes: customer?.notes ?? "",
  };
}

type CustomerCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomerCreateDialog({
  open,
  onOpenChange,
}: CustomerCreateDialogProps) {
  const { current } = useOrg();
  const router = useRouter();
  const organizationId = current?.id ?? "";
  const createMutation = useCreateCustomerMutation(organizationId);

  const [fields, setFields] = useState<CustomerFields>(fieldsFromCustomer());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  function updateField<K extends keyof CustomerFields>(
    key: K,
    value: CustomerFields[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const input: CreateCustomerInput = {
      name: fields.name.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim() || undefined,
      address: fields.address.trim() || undefined,
      city: fields.city.trim() || undefined,
      state: fields.state.trim() || undefined,
      postalCode: fields.postalCode.trim() || undefined,
      notes: fields.notes.trim() || undefined,
    };

    const nextErrors = validateCreate(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const result = await createMutation.mutateAsync(input);
      setSubmitSuccess("Customer created.");
      onOpenChange(false);
      router.push(`/dashboard/customers/${result.customer.id}`);
    } catch (error) {
      setSubmitError(
        toUserErrorMessage(error, "Unable to create the customer."),
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
          <DialogTitle>New Customer</DialogTitle>
          <DialogDescription>
            Add a customer to this organization for intake and jobs.
          </DialogDescription>
        </DialogHeader>

        <CustomerFormFields
          formId="create-customer-form"
          fields={fields}
          errors={errors}
          disabled={createMutation.isPending}
          onChange={updateField}
          onSubmit={handleSubmit}
          submitError={submitError}
          submitSuccess={submitSuccess}
        />

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
            form="create-customer-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CustomerEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSaved?: () => void;
};

export function CustomerEditDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerEditDialogProps) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const updateMutation = useUpdateCustomerMutation(organizationId);

  const [fields, setFields] = useState<CustomerFields>(() =>
    fieldsFromCustomer(customer),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  function updateField<K extends keyof CustomerFields>(
    key: K,
    value: CustomerFields[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const createShape: CreateCustomerInput = {
      name: fields.name.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim() || undefined,
      address: fields.address.trim() || undefined,
      city: fields.city.trim() || undefined,
      state: fields.state.trim() || undefined,
      postalCode: fields.postalCode.trim() || undefined,
      notes: fields.notes.trim() || undefined,
    };
    const nextErrors = validateCreate(createShape);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const body: UpdateCustomerInput = {
      name: createShape.name,
      phone: createShape.phone,
      email: createShape.email ?? null,
      address: createShape.address ?? null,
      city: createShape.city ?? null,
      state: createShape.state ?? null,
      postalCode: createShape.postalCode ?? null,
      notes: createShape.notes ?? null,
    };

    try {
      await updateMutation.mutateAsync({ id: customer.id, body });
      setSubmitSuccess("Customer updated.");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        toUserErrorMessage(error, "Unable to update the customer."),
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (updateMutation.isPending) return;
        if (next) {
          setFields(fieldsFromCustomer(customer));
          setErrors({});
          setSubmitError(null);
          setSubmitSuccess(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update contact and address details for this customer.
          </DialogDescription>
        </DialogHeader>

        <CustomerFormFields
          formId="edit-customer-form"
          fields={fields}
          errors={errors}
          disabled={updateMutation.isPending}
          onChange={updateField}
          onSubmit={handleSubmit}
          submitError={submitError}
          submitSuccess={submitSuccess}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-customer-form"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerFormFields({
  formId,
  fields,
  errors,
  disabled,
  onChange,
  onSubmit,
  submitError,
  submitSuccess,
}: {
  formId: string;
  fields: CustomerFields;
  errors: FormErrors;
  disabled: boolean;
  onChange: <K extends keyof CustomerFields>(
    key: K,
    value: CustomerFields[K],
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitError: string | null;
  submitSuccess: string | null;
}) {
  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${formId}-name`}>Name</Label>
          <Input
            id={`${formId}-name`}
            value={fields.name}
            onChange={(event) => onChange("name", event.target.value)}
            maxLength={200}
            required
            disabled={disabled}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-phone`}>Phone</Label>
          <Input
            id={`${formId}-phone`}
            value={fields.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            maxLength={32}
            required
            disabled={disabled}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            type="email"
            value={fields.email}
            onChange={(event) => onChange("email", event.target.value)}
            maxLength={255}
            disabled={disabled}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-address`}>Address</Label>
        <Input
          id={`${formId}-address`}
          value={fields.address}
          onChange={(event) => onChange("address", event.target.value)}
          maxLength={500}
          disabled={disabled}
          aria-invalid={Boolean(errors.address)}
        />
        {errors.address ? (
          <p className="text-xs text-destructive">{errors.address}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-city`}>City</Label>
          <Input
            id={`${formId}-city`}
            value={fields.city}
            onChange={(event) => onChange("city", event.target.value)}
            maxLength={100}
            disabled={disabled}
            aria-invalid={Boolean(errors.city)}
          />
          {errors.city ? (
            <p className="text-xs text-destructive">{errors.city}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-state`}>State</Label>
          <Input
            id={`${formId}-state`}
            value={fields.state}
            onChange={(event) => onChange("state", event.target.value)}
            maxLength={100}
            disabled={disabled}
            aria-invalid={Boolean(errors.state)}
          />
          {errors.state ? (
            <p className="text-xs text-destructive">{errors.state}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-postal`}>Postal code</Label>
          <Input
            id={`${formId}-postal`}
            value={fields.postalCode}
            onChange={(event) => onChange("postalCode", event.target.value)}
            maxLength={32}
            disabled={disabled}
            aria-invalid={Boolean(errors.postalCode)}
          />
          {errors.postalCode ? (
            <p className="text-xs text-destructive">{errors.postalCode}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-notes`}>Notes</Label>
        <Textarea
          id={`${formId}-notes`}
          value={fields.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          maxLength={2000}
          rows={3}
          disabled={disabled}
          aria-invalid={Boolean(errors.notes)}
        />
        {errors.notes ? (
          <p className="text-xs text-destructive">{errors.notes}</p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="text-sm text-foreground" aria-live="polite">
          {submitSuccess}
        </p>
      ) : null}
    </form>
  );
}
