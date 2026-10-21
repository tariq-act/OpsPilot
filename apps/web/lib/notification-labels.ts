import type {
  CustomerNotification,
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from "@/lib/types";

export const NOTIFICATION_EVENT_TYPE_LABEL: Record<
  NotificationEventType,
  string
> = {
  JOB_SCHEDULED: "Job scheduled",
  JOB_RESCHEDULED: "Job rescheduled",
  TECHNICIAN_ASSIGNED: "Technician assigned",
  JOB_COMPLETED: "Job completed",
  INVOICE_SENT: "Invoice sent",
  PAYMENT_CONFIRMED: "Payment confirmed",
  PAYMENT_REMINDER: "Payment reminder",
  FOLLOW_UP_DUE: "Follow-up due",
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
};

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SENT: "Sent",
  FAILED: "Failed",
};

export const NOTIFICATION_EVENT_TYPES = Object.keys(
  NOTIFICATION_EVENT_TYPE_LABEL,
) as NotificationEventType[];

export const NOTIFICATION_CHANNELS = Object.keys(
  NOTIFICATION_CHANNEL_LABEL,
) as NotificationChannel[];

export const NOTIFICATION_STATUSES = Object.keys(
  NOTIFICATION_STATUS_LABEL,
) as NotificationStatus[];

/** Delivery statuses that still need attention (not in-app unread). */
export const ATTENTION_NOTIFICATION_STATUSES = new Set<NotificationStatus>([
  "PENDING",
  "PROCESSING",
  "FAILED",
]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Mirrors API `buildNotificationContent` for list/detail display. */
export function getNotificationContent(notification: CustomerNotification): {
  title: string;
  message: string;
} {
  const payload = notification.payload;
  switch (notification.eventType) {
    case "JOB_SCHEDULED": {
      const start = asString(payload.scheduledStart, "the scheduled time");
      return {
        title: "Your service appointment is confirmed",
        message: `Your service appointment is confirmed for ${start}.`,
      };
    }
    case "JOB_RESCHEDULED": {
      const start = asString(payload.scheduledStart, "the new time");
      return {
        title: "Your service appointment was rescheduled",
        message: `Your service appointment was rescheduled to ${start}.`,
      };
    }
    case "TECHNICIAN_ASSIGNED":
      return {
        title: "A technician was assigned to your job",
        message: "A technician has been assigned to your service job.",
      };
    case "JOB_COMPLETED":
      return {
        title: "Your service has been completed",
        message: "Your service has been completed. Thank you for choosing us.",
      };
    case "INVOICE_SENT": {
      const number = asString(payload.invoiceNumber, "your invoice");
      return {
        title: "Your invoice is ready",
        message: `Invoice ${number} is ready for your review.`,
      };
    }
    case "PAYMENT_CONFIRMED": {
      const amount = asString(payload.amount, "your payment");
      return {
        title: "Payment confirmation",
        message: `We received your payment of ${amount}. Thank you.`,
      };
    }
    case "PAYMENT_REMINDER": {
      const number = asString(payload.invoiceNumber, "your invoice");
      return {
        title: "Payment reminder",
        message: `Invoice ${number} is awaiting payment.`,
      };
    }
    case "FOLLOW_UP_DUE":
      return {
        title: "Follow-up for your service",
        message: "A follow-up is due for your recent service.",
      };
  }
}

export type NotificationEntityLink = {
  href: string;
  label: string;
};

/** Resolve related entity routes from notification payload + customerId. */
export function getNotificationEntityLinks(
  notification: CustomerNotification,
): NotificationEntityLink[] {
  const links: NotificationEntityLink[] = [];
  const payload = notification.payload;

  links.push({
    href: `/dashboard/customers/${notification.customerId}`,
    label: "Customer",
  });

  const jobId = asString(payload.jobId);
  if (jobId) {
    links.push({ href: `/dashboard/jobs/${jobId}`, label: "Job" });
  }

  const invoiceId = asString(payload.invoiceId);
  if (invoiceId) {
    links.push({
      href: `/dashboard/invoices/${invoiceId}`,
      label: "Invoice",
    });
  }

  const followUpId = asString(payload.followUpId);
  if (followUpId) {
    links.push({
      href: `/dashboard/follow-ups/${followUpId}`,
      label: "Follow-up",
    });
  }

  return links;
}

export function getPrimaryNotificationHref(
  notification: CustomerNotification,
): string {
  const payload = notification.payload;
  const jobId = asString(payload.jobId);
  if (jobId) return `/dashboard/jobs/${jobId}`;
  const invoiceId = asString(payload.invoiceId);
  if (invoiceId) return `/dashboard/invoices/${invoiceId}`;
  const followUpId = asString(payload.followUpId);
  if (followUpId) return `/dashboard/follow-ups/${followUpId}`;
  return `/dashboard/customers/${notification.customerId}`;
}

export function canRetryNotification(status: NotificationStatus): boolean {
  return status === "FAILED";
}
