"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

import {
  AutomationActionBadge,
  AutomationActiveBadge,
  AutomationExecutionStatusBadge,
  AutomationTriggerBadge,
} from "@/components/automation/automation-badges";
import { AutomationRuleFormDialog } from "@/components/automation/automation-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AUTOMATION_ACTION_TYPE_LABEL,
  conditionFieldLabel,
} from "@/lib/automation-labels";
import { FOLLOW_UP_TYPE_LABEL } from "@/lib/follow-up-labels";
import { formatDateTime, shortId } from "@/lib/format";
import { INVOICE_ITEM_TYPE_LABEL } from "@/lib/invoice-item-type";
import { isAutomationManagerRole } from "@/lib/member-roles";
import { NOTIFICATION_CHANNEL_LABEL } from "@/lib/notification-labels";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useActivateAutomationRuleMutation,
  useAutomationExecutionsQuery,
  useAutomationRuleQuery,
  useDeactivateAutomationRuleMutation,
} from "@/lib/query/automation";
import { cn } from "@/lib/utils";
import type { AutomationAction, FollowUpType } from "@/lib/types";

export function AutomationDetail({ id }: { id: string }) {
  const { current } = useOrg();
  const organizationId = current?.id ?? "";
  const timeZone = current?.timezone ?? "UTC";
  const canManage = isAutomationManagerRole(current?.role);

  const detailQuery = useAutomationRuleQuery(organizationId, id);
  const rule = detailQuery.rule;
  const executionsQuery = useAutomationExecutionsQuery(organizationId, id, {
    limit: 20,
    offset: 0,
  });

  const activateMutation = useActivateAutomationRuleMutation(organizationId);
  const deactivateMutation = useDeactivateAutomationRuleMutation(organizationId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const pending =
    activateMutation.isPending || deactivateMutation.isPending;

  async function confirmActivate() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await activateMutation.mutateAsync(id);
      setActivateOpen(false);
      setActionSuccess("Rule activated.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to activate this rule."),
      );
      setActivateOpen(false);
    }
  }

  async function confirmDeactivate() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await deactivateMutation.mutateAsync(id);
      setDeactivateOpen(false);
      setActionSuccess("Rule deactivated.");
    } catch (error) {
      setActionError(
        toUserErrorMessage(error, "Unable to deactivate this rule."),
      );
      setDeactivateOpen(false);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Automation rule" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Automation rule" />
        <p role="alert" className="text-sm text-destructive">
          Only owners, admins, and dispatchers can manage automation rules.
        </p>
      </div>
    );
  }

  if (detailQuery.server.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Automation rule" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.server.isError || !rule) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/automation"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to automation
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            {detailQuery.server.error?.message ?? "Rule not found."}
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/automation"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" />
          Back to automation
        </Link>
        <PageHeader
          title={rule.name}
          description={`Rule ${shortId(rule.id)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
              {rule.isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDeactivateOpen(true)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => setActivateOpen(true)}
                >
                  Activate
                </Button>
              )}
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
            <AutomationActiveBadge isActive={rule.isActive} />
            <AutomationTriggerBadge trigger={rule.triggerEvent} />
          </div>
          {rule.description ? (
            <p className="mt-4 text-sm text-foreground">{rule.description}</p>
          ) : null}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Created">
              {formatDateTime(rule.createdAt, timeZone)}
            </Field>
            <Field label="Updated">
              {formatDateTime(rule.updatedAt, timeZone)}
            </Field>
            <Field label="Created by">
              <span className="font-mono text-xs">{rule.createdBy}</span>
            </Field>
            <Field label="Rule ID">
              <span className="font-mono text-xs">{rule.id}</span>
            </Field>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Conditions</h2>
          {rule.conditions.rules.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No conditions. Runs for every matching event.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Match {rule.conditions.match === "all" ? "all" : "any"} of:
              </p>
              <ul className="flex flex-col gap-2">
                {rule.conditions.rules.map((condition, index) => (
                  <li
                    key={`${condition.field}-${index}`}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {conditionFieldLabel(condition.field)}
                    </span>{" "}
                    {condition.operator === "eq" ? "equals" : "not equals"}{" "}
                    <span className="font-mono text-xs">{condition.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Actions</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {rule.actions.map((action, index) => (
            <li
              key={`${action.type}-${index}`}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AutomationActionBadge actionType={action.type} />
                <span className="text-sm font-medium text-foreground">
                  {AUTOMATION_ACTION_TYPE_LABEL[action.type]}
                </span>
              </div>
              <ActionDetails action={action} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Recent executions
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void executionsQuery.refetch()}
            disabled={executionsQuery.server.isFetching}
          >
            Refresh
          </Button>
        </div>

        {executionsQuery.server.isLoading ? (
          <div className="mt-4 h-24 animate-pulse rounded-md bg-muted" />
        ) : executionsQuery.server.isError ? (
          <div className="mt-4">
            <p role="alert" className="text-sm text-destructive">
              {executionsQuery.server.error?.message ??
                "Unable to load executions."}
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
              onClick={() => void executionsQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : executionsQuery.executions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No executions yet. Runs appear after a matching event triggers this
            rule.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executionsQuery.executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <AutomationExecutionStatusBadge
                        status={execution.status}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(
                        execution.startedAt ?? execution.createdAt,
                        timeZone,
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(execution.completedAt, timeZone)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {execution.attemptCount}
                    </TableCell>
                    <TableCell className="max-w-[18rem] text-sm text-muted-foreground">
                      {execution.error ? (
                        <span className="text-destructive">
                          {execution.error}
                        </span>
                      ) : execution.result?.actions?.length ? (
                        execution.result.actions
                          .map(
                            (row) =>
                              AUTOMATION_ACTION_TYPE_LABEL[
                                row.type as keyof typeof AUTOMATION_ACTION_TYPE_LABEL
                              ] ?? row.type,
                          )
                          .join(", ")
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {editOpen ? (
        <AutomationRuleFormDialog
          key={`edit-${rule.updatedAt}`}
          open
          onOpenChange={setEditOpen}
          mode="edit"
          rule={rule}
        />
      ) : null}

      <Dialog
        open={activateOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setActivateOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate this rule?</DialogTitle>
            <DialogDescription>
              The rule will run when matching events occur in this organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActivateOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmActivate()}
              disabled={pending}
            >
              {pending ? "Activating…" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setDeactivateOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate this rule?</DialogTitle>
            <DialogDescription>
              The rule stays in the list but will not run until activated again.
              Execution history is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateOpen(false)}
              disabled={pending}
            >
              Keep active
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeactivate()}
              disabled={pending}
            >
              {pending ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionDetails({ action }: { action: AutomationAction }) {
  if (action.type === "SEND_NOTIFICATION" || action.type === "SEND_PAYMENT_REMINDER") {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Channel:{" "}
        {action.channel
          ? NOTIFICATION_CHANNEL_LABEL[action.channel]
          : "Default"}
      </p>
    );
  }

  if (action.type === "SCHEDULE_FOLLOW_UP") {
    return (
      <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          Type:{" "}
          {action.followUpType
            ? FOLLOW_UP_TYPE_LABEL[action.followUpType as FollowUpType]
            : "—"}
        </div>
        <div>Due in: {action.dueInDays ?? "—"} days</div>
        {action.notes ? (
          <div className="sm:col-span-2">Notes: {action.notes}</div>
        ) : null}
      </dl>
    );
  }

  if (action.type === "CREATE_INVOICE") {
    return (
      <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          Due in {action.dueInDays ?? "—"} days
          {action.discount ? ` · Discount ${action.discount}` : ""}
          {action.tax ? ` · Tax ${action.tax}` : ""}
        </p>
        {action.items && action.items.length > 0 ? (
          <ul className="list-inside list-disc">
            {action.items.map((item, index) => (
              <li key={`${item.description}-${index}`}>
                {INVOICE_ITEM_TYPE_LABEL[item.type]}: {item.description} ×{" "}
                {item.quantity} @ {item.unitPrice}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return null;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
