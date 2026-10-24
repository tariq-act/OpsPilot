"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuPlus, LuTrash2 } from "react-icons/lu";

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
import {
  AUTOMATION_ACTION_TYPE_LABEL,
  AUTOMATION_CONDITION_FIELD_LABEL,
  AUTOMATION_TRIGGER_LABEL,
  AUTOMATION_TRIGGERS,
  CONDITION_FIELDS,
  PERMITTED_ACTIONS,
} from "@/lib/automation-labels";
import { FOLLOW_UP_TYPE_LABEL, FOLLOW_UP_TYPES } from "@/lib/follow-up-labels";
import {
  INVOICE_ITEM_TYPE_LABEL,
  INVOICE_ITEM_TYPES,
} from "@/lib/invoice-item-type";
import {
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_CHANNELS,
} from "@/lib/notification-labels";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useCreateAutomationRuleMutation,
  useUpdateAutomationRuleMutation,
} from "@/lib/query/automation";
import type {
  AutomationAction,
  AutomationActionItem,
  AutomationActionType,
  AutomationConditionField,
  AutomationConditionMatch,
  AutomationConditionOperator,
  AutomationConditionRule,
  AutomationRule,
  AutomationTrigger,
  CreateAutomationRuleInput,
  FollowUpType,
  InvoiceItemType,
  NotificationChannel,
  UpdateAutomationRuleInput,
} from "@/lib/types";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const SAFE_TOKEN = /^[A-Za-z0-9.:_-]{1,128}$/;

type ConditionDraft = AutomationConditionRule & { key: string };
type ActionDraft = AutomationAction & { key: string };
type ItemDraft = AutomationActionItem & { key: string };

function emptyCondition(
  field: AutomationConditionField = "customerId",
): ConditionDraft {
  return {
    key: crypto.randomUUID(),
    field,
    operator: "eq",
    value: "",
  };
}

function emptyItem(): ItemDraft {
  return {
    key: crypto.randomUUID(),
    type: "LABOR",
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

function emptyAction(type: AutomationActionType): ActionDraft {
  const base: ActionDraft = { key: crypto.randomUUID(), type };
  if (type === "CREATE_INVOICE") {
    return { ...base, items: [emptyItem()], dueInDays: 7 };
  }
  if (type === "SEND_NOTIFICATION" || type === "SEND_PAYMENT_REMINDER") {
    return { ...base, channel: "EMAIL" };
  }
  if (type === "SCHEDULE_FOLLOW_UP") {
    return {
      ...base,
      followUpType: "FEEDBACK",
      dueInDays: 7,
      notes: "",
    };
  }
  return base;
}

function toActionPayload(action: ActionDraft): AutomationAction {
  const payload: AutomationAction = { type: action.type };
  if (action.type === "CREATE_INVOICE") {
    payload.items = (action.items ?? []).map(
      ({ type, description, quantity, unitPrice }) => ({
        type,
        description: description.trim(),
        quantity: quantity.trim(),
        unitPrice: unitPrice.trim(),
      }),
    );
    if (action.discount?.trim()) payload.discount = action.discount.trim();
    if (action.tax?.trim()) payload.tax = action.tax.trim();
    if (action.dueInDays !== undefined) payload.dueInDays = action.dueInDays;
  }
  if (
    action.type === "SEND_NOTIFICATION" ||
    action.type === "SEND_PAYMENT_REMINDER"
  ) {
    if (action.channel) payload.channel = action.channel;
  }
  if (action.type === "SCHEDULE_FOLLOW_UP") {
    if (action.followUpType) payload.followUpType = action.followUpType;
    if (action.dueInDays !== undefined) payload.dueInDays = action.dueInDays;
    if (action.notes?.trim()) payload.notes = action.notes.trim();
  }
  return payload;
}

function validateRule(input: {
  name: string;
  triggerEvent: AutomationTrigger;
  conditions: { match: AutomationConditionMatch; rules: ConditionDraft[] };
  actions: ActionDraft[];
}): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (input.name.trim().length > 120) {
    return "Name must be at most 120 characters.";
  }
  if (input.actions.length === 0) return "Add at least one action.";
  if (input.actions.length > 5) return "A rule can have at most 5 actions.";
  if (input.conditions.rules.length > 10) {
    return "A rule can have at most 10 conditions.";
  }

  const allowedFields = new Set(CONDITION_FIELDS[input.triggerEvent]);
  for (const [index, rule] of input.conditions.rules.entries()) {
    if (!allowedFields.has(rule.field as AutomationConditionField)) {
      return `Condition ${index + 1}: field is not allowed for this trigger.`;
    }
    if (!SAFE_TOKEN.test(rule.value.trim())) {
      return `Condition ${index + 1}: value must be 1–128 letters, numbers, or .:_-`;
    }
  }

  const allowedActions = new Set(PERMITTED_ACTIONS[input.triggerEvent]);
  for (const [index, action] of input.actions.entries()) {
    if (!allowedActions.has(action.type)) {
      return `Action ${index + 1}: ${AUTOMATION_ACTION_TYPE_LABEL[action.type]} is not allowed for this trigger.`;
    }
    if (action.type === "CREATE_INVOICE") {
      const items = action.items ?? [];
      if (items.length === 0) {
        return `Action ${index + 1}: add at least one invoice line item.`;
      }
      for (const [itemIndex, item] of items.entries()) {
        if (!item.description.trim()) {
          return `Action ${index + 1}, line ${itemIndex + 1}: description is required.`;
        }
        if (!MONEY_PATTERN.test(item.quantity.trim())) {
          return `Action ${index + 1}, line ${itemIndex + 1}: quantity must be a decimal with up to 2 places.`;
        }
        if (!MONEY_PATTERN.test(item.unitPrice.trim())) {
          return `Action ${index + 1}, line ${itemIndex + 1}: unit price must be a decimal with up to 2 places.`;
        }
      }
      if (action.discount?.trim() && !MONEY_PATTERN.test(action.discount.trim())) {
        return `Action ${index + 1}: discount must be a decimal with up to 2 places.`;
      }
      if (action.tax?.trim() && !MONEY_PATTERN.test(action.tax.trim())) {
        return `Action ${index + 1}: tax must be a decimal with up to 2 places.`;
      }
    }
    if (
      (action.type === "SEND_NOTIFICATION" ||
        action.type === "SEND_PAYMENT_REMINDER") &&
      !action.channel
    ) {
      return `Action ${index + 1}: select a channel.`;
    }
    if (action.type === "SCHEDULE_FOLLOW_UP" && !action.followUpType) {
      return `Action ${index + 1}: select a follow-up type.`;
    }
  }
  return null;
}

type AutomationRuleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rule?: AutomationRule | null;
};

export function AutomationRuleFormDialog({
  open,
  onOpenChange,
  mode,
  rule,
}: AutomationRuleFormDialogProps) {
  const { current } = useOrg();
  const router = useRouter();
  const organizationId = current?.id ?? "";

  const createMutation = useCreateAutomationRuleMutation(organizationId);
  const updateMutation = useUpdateAutomationRuleMutation(organizationId);
  const pending = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [triggerEvent, setTriggerEvent] = useState<AutomationTrigger>(
    rule?.triggerEvent ?? "JOB_COMPLETED",
  );
  const [match, setMatch] = useState<AutomationConditionMatch>(
    rule?.conditions.match ?? "all",
  );
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    rule?.conditions.rules.map((row) => ({
      ...row,
      key: crypto.randomUUID(),
    })) ?? [],
  );
  const [actions, setActions] = useState<ActionDraft[]>(
    rule?.actions.map((action) => ({
      ...action,
      key: crypto.randomUUID(),
      items: action.items?.map((item) => ({
        ...item,
        key: crypto.randomUUID(),
      })),
    })) ?? [emptyAction("SEND_NOTIFICATION")],
  );
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  function onTriggerChange(next: AutomationTrigger) {
    setTriggerEvent(next);
    const allowedFields = new Set(CONDITION_FIELDS[next]);
    setConditions((prev) =>
      prev.filter((row) => allowedFields.has(row.field as AutomationConditionField)),
    );
    const allowedActions = new Set(PERMITTED_ACTIONS[next]);
    setActions((prev) => {
      const kept = prev.filter((action) => allowedActions.has(action.type));
      return kept.length > 0
        ? kept
        : [emptyAction(PERMITTED_ACTIONS[next][0]!)];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateRule({
      name,
      triggerEvent,
      conditions: { match, rules: conditions },
      actions,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const conditionsPayload = {
      match,
      rules: conditions.map(({ field, operator, value }) => ({
        field,
        operator,
        value: value.trim(),
      })),
    };
    const actionsPayload = actions.map(toActionPayload);

    try {
      if (mode === "create") {
        const body: CreateAutomationRuleInput = {
          name: name.trim(),
          description: description.trim() || undefined,
          triggerEvent,
          conditions: conditionsPayload,
          actions: actionsPayload,
          isActive,
        };
        const result = await createMutation.mutateAsync(body);
        onOpenChange(false);
        router.push(`/dashboard/automation/${result.rule.id}`);
      } else if (rule) {
        const body: UpdateAutomationRuleInput = {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          triggerEvent,
          conditions: conditionsPayload,
          actions: actionsPayload,
        };
        await updateMutation.mutateAsync({ id: rule.id, body });
        onOpenChange(false);
      }
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          mode === "create"
            ? "Unable to create the automation rule."
            : "Unable to update the automation rule.",
        ),
      );
    }
  }

  const permittedActionTypes = PERMITTED_ACTIONS[triggerEvent];
  const permittedConditionFields = CONDITION_FIELDS[triggerEvent];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create automation rule" : "Edit automation rule"}
          </DialogTitle>
          <DialogDescription>
            Choose when the rule runs, optional conditions, and the actions to
            take.
          </DialogDescription>
        </DialogHeader>

        <form
          id="automation-rule-form"
          className="flex flex-col gap-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-name">Name</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              disabled={pending}
              placeholder="e.g. Invoice after job complete"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-description">Description (optional)</Label>
            <Textarea
              id="automation-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={2000}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>When this happens</Label>
            <Select
              value={triggerEvent}
              onValueChange={(value) =>
                onTriggerChange((value as AutomationTrigger) ?? "JOB_COMPLETED")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_TRIGGERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {AUTOMATION_TRIGGER_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Conditions (optional)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Limit when the rule runs. Leave empty to run for every matching
                  event.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={match}
                  onValueChange={(value) =>
                    setMatch((value as AutomationConditionMatch) ?? "all")
                  }
                >
                  <SelectTrigger className="w-[8.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Match all</SelectItem>
                    <SelectItem value="any">Match any</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={conditions.length >= 10 || pending}
                  onClick={() =>
                    setConditions((prev) => [
                      ...prev,
                      emptyCondition(permittedConditionFields[0]),
                    ])
                  }
                >
                  <LuPlus aria-hidden="true" />
                  Add
                </Button>
              </div>
            </div>

            {conditions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No conditions. The rule runs for every {AUTOMATION_TRIGGER_LABEL[triggerEvent].toLowerCase()} event.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {conditions.map((condition, index) => (
                  <li
                    key={condition.key}
                    className="grid gap-2 sm:grid-cols-[1fr_6rem_1fr_auto]"
                  >
                    <Select
                      value={condition.field}
                      onValueChange={(value) =>
                        setConditions((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  field:
                                    (value as AutomationConditionField) ??
                                    row.field,
                                }
                              : row,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {permittedConditionFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {AUTOMATION_CONDITION_FIELD_LABEL[field]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) =>
                        setConditions((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  operator:
                                    (value as AutomationConditionOperator) ??
                                    "eq",
                                }
                              : row,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">equals</SelectItem>
                        <SelectItem value="neq">not equals</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={condition.value}
                      onChange={(event) =>
                        setConditions((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, value: event.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Value"
                      disabled={pending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove condition"
                      disabled={pending}
                      onClick={() =>
                        setConditions((prev) =>
                          prev.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      <LuTrash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Then do this
                </h3>
                <p className="text-xs text-muted-foreground">
                  Up to 5 actions, limited by the selected trigger.
                </p>
              </div>
              <Select
                value={null}
                onValueChange={(value) => {
                  if (!value) return;
                  const type = value as AutomationActionType;
                  if (actions.length >= 5) return;
                  setActions((prev) => [...prev, emptyAction(type)]);
                }}
              >
                <SelectTrigger className="w-[12rem]">
                  <SelectValue placeholder="Add action" />
                </SelectTrigger>
                <SelectContent>
                  {permittedActionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {AUTOMATION_ACTION_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ul className="mt-3 flex flex-col gap-4">
              {actions.map((action, actionIndex) => (
                <li
                  key={action.key}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {AUTOMATION_ACTION_TYPE_LABEL[action.type]}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={actions.length <= 1 || pending}
                      onClick={() =>
                        setActions((prev) =>
                          prev.filter((_, index) => index !== actionIndex),
                        )
                      }
                    >
                      <LuTrash2 aria-hidden="true" />
                      Remove
                    </Button>
                  </div>

                  {(action.type === "SEND_NOTIFICATION" ||
                    action.type === "SEND_PAYMENT_REMINDER") && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Label>Channel</Label>
                      <Select
                        value={action.channel ?? null}
                        onValueChange={(value) =>
                          setActions((prev) =>
                            prev.map((row, index) =>
                              index === actionIndex
                                ? {
                                    ...row,
                                    channel:
                                      (value as NotificationChannel) ??
                                      "EMAIL",
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTIFICATION_CHANNELS.map((channel) => (
                            <SelectItem key={channel} value={channel}>
                              {NOTIFICATION_CHANNEL_LABEL[channel]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {action.type === "SCHEDULE_FOLLOW_UP" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label>Follow-up type</Label>
                        <Select
                          value={action.followUpType ?? null}
                          onValueChange={(value) =>
                            setActions((prev) =>
                              prev.map((row, index) =>
                                index === actionIndex
                                  ? {
                                      ...row,
                                      followUpType:
                                        (value as FollowUpType) ?? "FEEDBACK",
                                    }
                                  : row,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {FOLLOW_UP_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {FOLLOW_UP_TYPE_LABEL[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Due in days</Label>
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          value={action.dueInDays ?? 7}
                          onChange={(event) =>
                            setActions((prev) =>
                              prev.map((row, index) =>
                                index === actionIndex
                                  ? {
                                      ...row,
                                      dueInDays: Number(event.target.value),
                                    }
                                  : row,
                              ),
                            )
                          }
                          disabled={pending}
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label>Notes (optional)</Label>
                        <Textarea
                          value={action.notes ?? ""}
                          onChange={(event) =>
                            setActions((prev) =>
                              prev.map((row, index) =>
                                index === actionIndex
                                  ? { ...row, notes: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          rows={2}
                          maxLength={2000}
                          disabled={pending}
                        />
                      </div>
                    </div>
                  )}

                  {action.type === "CREATE_INVOICE" && (
                    <div className="mt-3 flex flex-col gap-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex flex-col gap-2">
                          <Label>Due in days</Label>
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            value={action.dueInDays ?? 7}
                            onChange={(event) =>
                              setActions((prev) =>
                                prev.map((row, index) =>
                                  index === actionIndex
                                    ? {
                                        ...row,
                                        dueInDays: Number(event.target.value),
                                      }
                                    : row,
                                ),
                              )
                            }
                            disabled={pending}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Discount</Label>
                          <Input
                            value={action.discount ?? ""}
                            onChange={(event) =>
                              setActions((prev) =>
                                prev.map((row, index) =>
                                  index === actionIndex
                                    ? { ...row, discount: event.target.value }
                                    : row,
                                ),
                              )
                            }
                            placeholder="0.00"
                            disabled={pending}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Tax</Label>
                          <Input
                            value={action.tax ?? ""}
                            onChange={(event) =>
                              setActions((prev) =>
                                prev.map((row, index) =>
                                  index === actionIndex
                                    ? { ...row, tax: event.target.value }
                                    : row,
                                ),
                              )
                            }
                            placeholder="0.00"
                            disabled={pending}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Line items
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            setActions((prev) =>
                              prev.map((row, index) =>
                                index === actionIndex
                                  ? {
                                      ...row,
                                      items: [
                                        ...((row.items as ItemDraft[] | undefined) ??
                                          []),
                                        emptyItem(),
                                      ],
                                    }
                                  : row,
                              ),
                            )
                          }
                        >
                          <LuPlus aria-hidden="true" />
                          Add line
                        </Button>
                      </div>

                      <ul className="flex flex-col gap-2">
                        {((action.items as ItemDraft[] | undefined) ?? []).map(
                          (item, itemIndex) => (
                            <li
                              key={item.key}
                              className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[7rem_1fr_5rem_5rem_auto]"
                            >
                              <Select
                                value={item.type}
                                onValueChange={(value) =>
                                  setActions((prev) =>
                                    prev.map((row, index) => {
                                      if (index !== actionIndex) return row;
                                      const items = [
                                        ...((row.items as ItemDraft[] | undefined) ??
                                          []),
                                      ];
                                      items[itemIndex] = {
                                        ...items[itemIndex]!,
                                        type:
                                          (value as InvoiceItemType) ?? "LABOR",
                                      };
                                      return { ...row, items };
                                    }),
                                  )
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {INVOICE_ITEM_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {INVOICE_ITEM_TYPE_LABEL[type]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={item.description}
                                onChange={(event) =>
                                  setActions((prev) =>
                                    prev.map((row, index) => {
                                      if (index !== actionIndex) return row;
                                      const items = [
                                        ...((row.items as ItemDraft[] | undefined) ??
                                          []),
                                      ];
                                      items[itemIndex] = {
                                        ...items[itemIndex]!,
                                        description: event.target.value,
                                      };
                                      return { ...row, items };
                                    }),
                                  )
                                }
                                placeholder="Description"
                                disabled={pending}
                              />
                              <Input
                                value={item.quantity}
                                onChange={(event) =>
                                  setActions((prev) =>
                                    prev.map((row, index) => {
                                      if (index !== actionIndex) return row;
                                      const items = [
                                        ...((row.items as ItemDraft[] | undefined) ??
                                          []),
                                      ];
                                      items[itemIndex] = {
                                        ...items[itemIndex]!,
                                        quantity: event.target.value,
                                      };
                                      return { ...row, items };
                                    }),
                                  )
                                }
                                placeholder="Qty"
                                disabled={pending}
                              />
                              <Input
                                value={item.unitPrice}
                                onChange={(event) =>
                                  setActions((prev) =>
                                    prev.map((row, index) => {
                                      if (index !== actionIndex) return row;
                                      const items = [
                                        ...((row.items as ItemDraft[] | undefined) ??
                                          []),
                                      ];
                                      items[itemIndex] = {
                                        ...items[itemIndex]!,
                                        unitPrice: event.target.value,
                                      };
                                      return { ...row, items };
                                    }),
                                  )
                                }
                                placeholder="Price"
                                disabled={pending}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Remove line"
                                disabled={pending}
                                onClick={() =>
                                  setActions((prev) =>
                                    prev.map((row, index) => {
                                      if (index !== actionIndex) return row;
                                      const items = (
                                        (row.items as ItemDraft[] | undefined) ??
                                        []
                                      ).filter(
                                        (_, idx) => idx !== itemIndex,
                                      );
                                      return { ...row, items };
                                    }),
                                  )
                                }
                              >
                                <LuTrash2 aria-hidden="true" />
                              </Button>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {mode === "create" ? (
            <div className="flex flex-col gap-2">
              <Label>Start active</Label>
              <Select
                value={isActive ? "true" : "false"}
                onValueChange={(value) => setIsActive(value === "true")}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

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
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="automation-rule-form" disabled={pending}>
            {pending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create rule"
                : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
