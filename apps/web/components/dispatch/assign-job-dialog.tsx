"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ApiError } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useAssignTechniciansMutation,
  useJobAssignmentsQuery,
  useReassignTechnicianMutation,
} from "@/lib/query/jobs";
import {
  jobsToWindows,
  wouldOverlapExisting,
  workloadLevel,
} from "@/lib/schedule-overlap";
import type { Job, Technician } from "@/lib/types";

type AssignJobDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  job: Job | null;
  technicians: Technician[];
  technicianLabelById: Map<string, string>;
  technicianDayJobsById: Map<string, Job[]>;
  onSuccess?: (message: string) => void;
};

export function AssignJobDialog({
  open,
  onOpenChange,
  organizationId,
  job,
  technicians,
  technicianLabelById,
  technicianDayJobsById,
  onSuccess,
}: AssignJobDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && job ? (
        <AssignJobDialogBody
          key={job.id}
          onOpenChange={onOpenChange}
          organizationId={organizationId}
          job={job}
          technicians={technicians}
          technicianLabelById={technicianLabelById}
          technicianDayJobsById={technicianDayJobsById}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  );
}

function AssignJobDialogBody({
  onOpenChange,
  organizationId,
  job,
  technicians,
  technicianLabelById,
  technicianDayJobsById,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  job: Job;
  technicians: Technician[];
  technicianLabelById: Map<string, string>;
  technicianDayJobsById: Map<string, Job[]>;
  onSuccess?: (message: string) => void;
}) {
  const assignmentsQuery = useJobAssignmentsQuery(organizationId, job.id);
  const assignMutation = useAssignTechniciansMutation(organizationId);
  const reassignMutation = useReassignTechnicianMutation(organizationId);

  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeAssignment = useMemo(
    () =>
      assignmentsQuery.assignments.find(
        (assignment) => assignment.status === "ASSIGNED",
      ) ?? null,
    [assignmentsQuery.assignments],
  );

  const activeTechnicians = technicians.filter(
    (technician) => technician.status === "ACTIVE",
  );

  const pending =
    assignMutation.isPending ||
    reassignMutation.isPending ||
    assignmentsQuery.server.isLoading;

  const selectedDayJobs = technicianId
    ? (technicianDayJobsById.get(technicianId) ?? [])
    : [];
  const clientOverlap =
    job.scheduledStart &&
    job.scheduledEnd &&
    technicianId &&
    wouldOverlapExisting(
      jobsToWindows(selectedDayJobs),
      job.scheduledStart,
      job.scheduledEnd,
      job.id,
    );

  const selectedWorkload = workloadLevel(selectedDayJobs.length);
  const isReassign = Boolean(activeAssignment);

  function requestSubmit() {
    if (!technicianId) {
      setError("Select a technician to assign.");
      return;
    }
    if (!job.scheduledStart || !job.scheduledEnd) {
      setError("Schedule the job before assigning a technician.");
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function submit() {
    if (!technicianId) return;
    setError(null);
    try {
      if (activeAssignment) {
        await reassignMutation.mutateAsync({
          id: job.id,
          assignmentId: activeAssignment.id,
          body: {
            technicianId,
            allowOverlap: allowOverlap || undefined,
          },
        });
        onSuccess?.("Technician reassigned.");
      } else {
        await assignMutation.mutateAsync({
          id: job.id,
          body: {
            technicianIds: [technicianId],
            allowOverlap: allowOverlap || undefined,
          },
        });
        onSuccess?.("Technician assigned.");
      }
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && !allowOverlap) {
        setError(
          `${toUserErrorMessage(err, "Assignment conflict detected.")} Enable allow overlap to submit anyway.`,
        );
      } else {
        setError(
          toUserErrorMessage(err, "Unable to update technician assignment."),
        );
      }
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReassign ? "Reassign technician" : "Assign technician"}
          </DialogTitle>
          <DialogDescription>
            {`${isReassign ? "Replace the technician on" : "Assign an active technician to"} “${job.title}”.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dispatch-assign-technician">Technician</Label>
            <Select
              value={technicianId}
              onValueChange={setTechnicianId}
              disabled={pending}
            >
              <SelectTrigger id="dispatch-assign-technician" className="w-full">
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                {activeTechnicians.map((technician) => {
                  const dayCount =
                    technicianDayJobsById.get(technician.id)?.length ?? 0;
                  const label =
                    technicianLabelById.get(technician.id) ??
                    technician.employeeCode;
                  return (
                    <SelectItem key={technician.id} value={technician.id}>
                      {label} · {dayCount} today
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {activeTechnicians.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active technicians available.
              </p>
            ) : null}
          </div>

          {technicianId ? (
            <p className="text-xs text-muted-foreground">
              Workload today: {selectedDayJobs.length} job
              {selectedDayJobs.length === 1 ? "" : "s"} ({selectedWorkload}).
            </p>
          ) : null}

          {clientOverlap ? (
            <p className="rounded-lg bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue-foreground">
              This job&apos;s schedule overlaps another assignment for this
              technician today.
            </p>
          ) : null}

          <Label className="flex cursor-pointer items-center gap-2 font-normal">
            <Checkbox
              checked={allowOverlap}
              onCheckedChange={(checked) => setAllowOverlap(checked === true)}
              disabled={pending}
            />
            Allow schedule overlap
          </Label>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignMutation.isPending || reassignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={requestSubmit}
            disabled={pending}
          >
            Review
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (assignMutation.isPending || reassignMutation.isPending) return;
          setConfirmOpen(next);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isReassign ? "Confirm reassignment" : "Confirm assignment"}
            </DialogTitle>
            <DialogDescription>
              {technicianId
                ? `${isReassign ? "Reassign" : "Assign"} ${technicianLabelById.get(technicianId) ?? "this technician"} to “${job.title}”.`
                : "Confirm this change."}
              {allowOverlap ? " Overlap will be allowed." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={assignMutation.isPending || reassignMutation.isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={assignMutation.isPending || reassignMutation.isPending}
            >
              {assignMutation.isPending || reassignMutation.isPending
                ? "Saving…"
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
