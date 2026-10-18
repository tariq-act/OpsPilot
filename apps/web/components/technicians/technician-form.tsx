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
import { toUserErrorMessage } from "@/lib/query/errors";
import { useOrganizationMembersQuery } from "@/lib/query/organizations";
import {
  useCreateTechnicianMutation,
  useTechniciansQuery,
  useUpdateTechnicianMutation,
} from "@/lib/query/technicians";
import { TECHNICIAN_STATUS_LABEL } from "@/lib/technician-status";
import type {
  CreateTechnicianInput,
  Technician,
  TechnicianStatus,
  UpdateTechnicianInput,
} from "@/lib/types";

const EMPLOYEE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const STATUS_OPTIONS: TechnicianStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
];

type CreateErrors = Partial<Record<keyof CreateTechnicianInput, string>>;
type EditErrors = Partial<Record<keyof UpdateTechnicianInput, string>>;

function validateCreate(input: CreateTechnicianInput): CreateErrors {
  const errors: CreateErrors = {};
  if (!input.userId.trim()) {
    errors.userId = "Organization member is required.";
  }
  if (input.employeeCode) {
    if (input.employeeCode.length > 64) {
      errors.employeeCode = "Employee code must be at most 64 characters.";
    } else if (!EMPLOYEE_CODE_PATTERN.test(input.employeeCode)) {
      errors.employeeCode =
        "Use letters, numbers, dots, underscores, or hyphens.";
    }
  }
  if (input.phone && input.phone.length > 32) {
    errors.phone = "Phone must be at most 32 characters.";
  }
  if (input.bio && input.bio.length > 2000) {
    errors.bio = "Bio must be at most 2000 characters.";
  }
  return errors;
}

function validateUpdate(input: UpdateTechnicianInput): EditErrors {
  const errors: EditErrors = {};
  if (input.employeeCode !== undefined) {
    if (!input.employeeCode.trim()) {
      errors.employeeCode = "Employee code is required.";
    } else if (input.employeeCode.length > 64) {
      errors.employeeCode = "Employee code must be at most 64 characters.";
    } else if (!EMPLOYEE_CODE_PATTERN.test(input.employeeCode)) {
      errors.employeeCode =
        "Use letters, numbers, dots, underscores, or hyphens.";
    }
  }
  if (input.phone && input.phone.length > 32) {
    errors.phone = "Phone must be at most 32 characters.";
  }
  if (input.bio && input.bio.length > 2000) {
    errors.bio = "Bio must be at most 2000 characters.";
  }
  return errors;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

type TechnicianCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TechnicianCreateDialog({
  open,
  onOpenChange,
}: TechnicianCreateDialogProps) {
  const { current } = useOrg();
  const router = useRouter();
  const organizationId = current?.id ?? "";

  const membersQuery = useOrganizationMembersQuery(organizationId);
  const techniciansQuery = useTechniciansQuery(organizationId);
  const createMutation = useCreateTechnicianMutation(organizationId);

  const [userId, setUserId] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [errors, setErrors] = useState<CreateErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const existingUserIds = useMemo(() => {
    return new Set(techniciansQuery.technicians.map((row) => row.userId));
  }, [techniciansQuery.technicians]);

  const eligibleMembers = useMemo(() => {
    return membersQuery.members.filter(
      (member) =>
        member.status === "ACTIVE" &&
        member.role === "TECHNICIAN" &&
        !existingUserIds.has(member.userId),
    );
  }, [membersQuery.members, existingUserIds]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const input: CreateTechnicianInput = {
      userId: userId ?? "",
      employeeCode: employeeCode.trim() || undefined,
      phone: phone.trim() || undefined,
      bio: bio.trim() || undefined,
      hireDate: fromDateInputValue(hireDate),
    };

    const nextErrors = validateCreate(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const result = await createMutation.mutateAsync(input);
      setSubmitSuccess("Technician profile created.");
      onOpenChange(false);
      router.push(`/dashboard/technicians/${result.technician.id}`);
    } catch (error) {
      setSubmitError(
        toUserErrorMessage(error, "Unable to create the technician profile."),
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
          <DialogTitle>Add Technician</DialogTitle>
          <DialogDescription>
            Create a field profile for an organization member with the
            Technician role. Employee code is generated when omitted.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-technician-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="tech-user">Organization member</Label>
            <Select
              value={userId}
              onValueChange={(value) => setUserId(value)}
              modal={false}
              disabled={
                membersQuery.server.isLoading ||
                createMutation.isPending ||
                eligibleMembers.length === 0
              }
            >
              <SelectTrigger
                id="tech-user"
                className="w-full"
                aria-invalid={Boolean(errors.userId)}
              >
                <SelectValue
                  placeholder={
                    eligibleMembers.length === 0
                      ? "No eligible members"
                      : "Select a technician member"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.userName} ({member.userEmail})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId ? (
              <p className="text-xs text-destructive">{errors.userId}</p>
            ) : null}
            {membersQuery.server.isSuccess && eligibleMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No eligible members yet. The backend requires an active org
                member whose role is Technician and who does not already have a
                technician profile. Invite or promote a member to that role,
                then reopen this dialog.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tech-code">Employee code</Label>
              <Input
                id="tech-code"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                maxLength={64}
                disabled={createMutation.isPending}
                aria-invalid={Boolean(errors.employeeCode)}
                placeholder="Optional"
              />
              {errors.employeeCode ? (
                <p className="text-xs text-destructive">{errors.employeeCode}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tech-phone">Phone</Label>
              <Input
                id="tech-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={32}
                disabled={createMutation.isPending}
                aria-invalid={Boolean(errors.phone)}
                placeholder="Optional"
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tech-hire">Hire date</Label>
            <Input
              id="tech-hire"
              type="date"
              value={hireDate}
              onChange={(event) => setHireDate(event.target.value)}
              disabled={createMutation.isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tech-bio">Bio</Label>
            <Textarea
              id="tech-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.bio)}
              placeholder="Optional"
            />
            {errors.bio ? (
              <p className="text-xs text-destructive">{errors.bio}</p>
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
            form="create-technician-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TechnicianEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: Technician;
  onSaved?: () => void;
};

export function TechnicianEditDialog({
  open,
  onOpenChange,
  technician,
  onSaved,
}: TechnicianEditDialogProps) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const updateMutation = useUpdateTechnicianMutation(organizationId);

  const [employeeCode, setEmployeeCode] = useState(technician.employeeCode);
  const [phone, setPhone] = useState(technician.phone ?? "");
  const [bio, setBio] = useState(technician.bio ?? "");
  const [status, setStatus] = useState<TechnicianStatus>(technician.status);
  const [hireDate, setHireDate] = useState(
    toDateInputValue(technician.hireDate),
  );
  const [errors, setErrors] = useState<EditErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  function resetFromTechnician() {
    setEmployeeCode(technician.employeeCode);
    setPhone(technician.phone ?? "");
    setBio(technician.bio ?? "");
    setStatus(technician.status);
    setHireDate(toDateInputValue(technician.hireDate));
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const body: UpdateTechnicianInput = {
      employeeCode: employeeCode.trim(),
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      status,
      hireDate: hireDate.trim()
        ? fromDateInputValue(hireDate) ?? null
        : null,
    };

    const nextErrors = validateUpdate(body);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await updateMutation.mutateAsync({ id: technician.id, body });
      setSubmitSuccess("Technician updated.");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        toUserErrorMessage(error, "Unable to update the technician."),
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (updateMutation.isPending) return;
        if (next) resetFromTechnician();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Edit Technician</DialogTitle>
          <DialogDescription>
            Update profile fields and status for this technician.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-technician-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-tech-code">Employee code</Label>
              <Input
                id="edit-tech-code"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                maxLength={64}
                disabled={updateMutation.isPending}
                aria-invalid={Boolean(errors.employeeCode)}
              />
              {errors.employeeCode ? (
                <p className="text-xs text-destructive">{errors.employeeCode}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-tech-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (value) setStatus(value as TechnicianStatus);
                }}
                modal={false}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger id="edit-tech-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TECHNICIAN_STATUS_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-tech-phone">Phone</Label>
              <Input
                id="edit-tech-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={32}
                disabled={updateMutation.isPending}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-tech-hire">Hire date</Label>
              <Input
                id="edit-tech-hire"
                type="date"
                value={hireDate}
                onChange={(event) => setHireDate(event.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-tech-bio">Bio</Label>
            <Textarea
              id="edit-tech-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={updateMutation.isPending}
              aria-invalid={Boolean(errors.bio)}
            />
            {errors.bio ? (
              <p className="text-xs text-destructive">{errors.bio}</p>
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
            form="edit-technician-form"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
