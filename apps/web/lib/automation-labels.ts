import type {
  AutomationAction,
  AutomationActionType,
  AutomationConditionField,
  AutomationExecutionStatus,
  AutomationTrigger,
} from "@/lib/types";

export const AUTOMATION_TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  JOB_COMPLETED: "Job completed",
  INVOICE_SENT: "Invoice sent",
  PAYMENT_RECEIVED: "Payment received",
  FOLLOW_UP_DUE: "Follow-up due",
};

export const AUTOMATION_ACTION_TYPE_LABEL: Record<
  AutomationActionType,
  string
> = {
  CREATE_INVOICE: "Create invoice",
  SEND_NOTIFICATION: "Send notification",
  SCHEDULE_FOLLOW_UP: "Schedule follow-up",
  SEND_PAYMENT_REMINDER: "Send payment reminder",
};

export const AUTOMATION_EXECUTION_STATUS_LABEL: Record<
  AutomationExecutionStatus,
  string
> = {
  PENDING: "Pending",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
};

export const AUTOMATION_CONDITION_FIELD_LABEL: Record<
  AutomationConditionField,
  string
> = {
  customerId: "Customer",
  jobId: "Job",
  invoiceId: "Invoice",
  paymentId: "Payment",
  followUpId: "Follow-up",
  followUpType: "Follow-up type",
  currency: "Currency",
  method: "Payment method",
};

/** Mirrors API PERMITTED_ACTIONS. */
export const PERMITTED_ACTIONS: Record<
  AutomationTrigger,
  readonly AutomationActionType[]
> = {
  JOB_COMPLETED: [
    "CREATE_INVOICE",
    "SEND_NOTIFICATION",
    "SCHEDULE_FOLLOW_UP",
  ],
  INVOICE_SENT: [
    "SEND_NOTIFICATION",
    "SCHEDULE_FOLLOW_UP",
    "SEND_PAYMENT_REMINDER",
  ],
  PAYMENT_RECEIVED: ["SEND_NOTIFICATION", "SCHEDULE_FOLLOW_UP"],
  FOLLOW_UP_DUE: ["SEND_NOTIFICATION", "SEND_PAYMENT_REMINDER"],
};

/** Mirrors API CONDITION_FIELDS. */
export const CONDITION_FIELDS: Record<
  AutomationTrigger,
  readonly AutomationConditionField[]
> = {
  JOB_COMPLETED: ["customerId", "jobId"],
  INVOICE_SENT: ["customerId", "jobId", "invoiceId", "currency"],
  PAYMENT_RECEIVED: [
    "customerId",
    "jobId",
    "invoiceId",
    "paymentId",
    "currency",
    "method",
  ],
  FOLLOW_UP_DUE: ["customerId", "jobId", "followUpId", "followUpType"],
};

export const AUTOMATION_TRIGGERS = Object.keys(
  AUTOMATION_TRIGGER_LABEL,
) as AutomationTrigger[];

export const AUTOMATION_ACTION_TYPES = Object.keys(
  AUTOMATION_ACTION_TYPE_LABEL,
) as AutomationActionType[];

export const AUTOMATION_EXECUTION_STATUSES = Object.keys(
  AUTOMATION_EXECUTION_STATUS_LABEL,
) as AutomationExecutionStatus[];

export function summarizeActions(actions: AutomationAction[]): string {
  if (actions.length === 0) return "No actions";
  return actions
    .map((action) => AUTOMATION_ACTION_TYPE_LABEL[action.type])
    .join(", ");
}

export function conditionFieldLabel(field: string): string {
  if (field in AUTOMATION_CONDITION_FIELD_LABEL) {
    return AUTOMATION_CONDITION_FIELD_LABEL[
      field as AutomationConditionField
    ];
  }
  return field;
}
