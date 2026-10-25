/** Human-readable labels for audit actions and entity types (API enums). */

export const AUDIT_ACTIONS = [
  "ORGANIZATION_CREATED",
  "MEMBER_UPDATED",
  "MEMBER_REMOVED",
  "INVITATION_CREATED",
  "INVITATION_ACCEPTED",
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_DEACTIVATED",
  "SERVICE_REQUEST_CREATED",
  "SERVICE_REQUEST_UPDATED",
  "SERVICE_REQUEST_CANCELLED",
  "JOB_CREATED",
  "JOB_SCHEDULED",
  "JOB_ASSIGNED",
  "JOB_STATUS_CHANGED",
  "JOB_COMPLETED",
  "JOB_CANCELLED",
  "INVOICE_CREATED",
  "INVOICE_SENT",
  "INVOICE_VOIDED",
  "PAYMENT_RECORDED",
  "PAYMENT_REFUNDED",
  "AUTOMATION_RULE_CREATED",
  "AUTOMATION_RULE_UPDATED",
  "AUTOMATION_RULE_ACTIVATED",
  "AUTOMATION_RULE_DEACTIVATED",
  "AUTOMATION_EXECUTION_FAILED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "ORGANIZATION",
  "MEMBER",
  "INVITATION",
  "CUSTOMER",
  "SERVICE_REQUEST",
  "JOB",
  "INVOICE",
  "PAYMENT",
  "AUTOMATION_RULE",
  "AUTOMATION_EXECUTION",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  ORGANIZATION_CREATED: "Organization created",
  MEMBER_UPDATED: "Member updated",
  MEMBER_REMOVED: "Member removed",
  INVITATION_CREATED: "Invitation sent",
  INVITATION_ACCEPTED: "Invitation accepted",
  CUSTOMER_CREATED: "Customer added",
  CUSTOMER_UPDATED: "Customer updated",
  CUSTOMER_DEACTIVATED: "Customer deactivated",
  SERVICE_REQUEST_CREATED: "Service request created",
  SERVICE_REQUEST_UPDATED: "Service request updated",
  SERVICE_REQUEST_CANCELLED: "Service request cancelled",
  JOB_CREATED: "Job created",
  JOB_SCHEDULED: "Job scheduled",
  JOB_ASSIGNED: "Job assigned",
  JOB_STATUS_CHANGED: "Job status changed",
  JOB_COMPLETED: "Job completed",
  JOB_CANCELLED: "Job cancelled",
  INVOICE_CREATED: "Invoice created",
  INVOICE_SENT: "Invoice sent",
  INVOICE_VOIDED: "Invoice voided",
  PAYMENT_RECORDED: "Payment recorded",
  PAYMENT_REFUNDED: "Payment refunded",
  AUTOMATION_RULE_CREATED: "Automation rule created",
  AUTOMATION_RULE_UPDATED: "Automation rule updated",
  AUTOMATION_RULE_ACTIVATED: "Automation rule activated",
  AUTOMATION_RULE_DEACTIVATED: "Automation rule deactivated",
  AUTOMATION_EXECUTION_FAILED: "Automation failed",
};

export const AUDIT_ENTITY_TYPE_LABEL: Record<AuditEntityType, string> = {
  ORGANIZATION: "Organization",
  MEMBER: "Member",
  INVITATION: "Invitation",
  CUSTOMER: "Customer",
  SERVICE_REQUEST: "Service request",
  JOB: "Job",
  INVOICE: "Invoice",
  PAYMENT: "Payment",
  AUTOMATION_RULE: "Automation rule",
  AUTOMATION_EXECUTION: "Automation execution",
};

export function getAuditActionLabel(action: string): string {
  if (action in AUDIT_ACTION_LABEL) {
    return AUDIT_ACTION_LABEL[action as AuditAction];
  }
  return action
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function getAuditEntityTypeLabel(entityType: string): string {
  if (entityType in AUDIT_ENTITY_TYPE_LABEL) {
    return AUDIT_ENTITY_TYPE_LABEL[entityType as AuditEntityType];
  }
  return entityType;
}

export function isAuditFailureAction(action: string): boolean {
  return action === "AUTOMATION_EXECUTION_FAILED";
}

export function getAuditEntityHref(
  entityType: string,
  entityId: string,
): string | null {
  switch (entityType) {
    case "CUSTOMER":
      return `/dashboard/customers/${entityId}`;
    case "SERVICE_REQUEST":
      return `/dashboard/service-requests/${entityId}`;
    case "JOB":
      return `/dashboard/jobs/${entityId}`;
    case "INVOICE":
    case "PAYMENT":
      return `/dashboard/invoices/${entityId}`;
    case "AUTOMATION_RULE":
      return `/dashboard/automation/${entityId}`;
    default:
      return null;
  }
}
