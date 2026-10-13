CREATE TYPE "notification_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "notification_event_type" AS ENUM('JOB_SCHEDULED', 'JOB_RESCHEDULED', 'TECHNICIAN_ASSIGNED', 'JOB_COMPLETED', 'INVOICE_SENT', 'PAYMENT_CONFIRMED');--> statement-breakpoint
CREATE TYPE "notification_status" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TABLE "customer_notification" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'PENDING'::"notification_status" NOT NULL,
	"recipient" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_notification_org_idempotency_uidx" UNIQUE("organization_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "customer_notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "customer_notification_organizationId_idx" ON "customer_notification" ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_notification_customerId_idx" ON "customer_notification" ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_notification_status_idx" ON "customer_notification" ("status");--> statement-breakpoint
CREATE INDEX "customer_notification_eventType_idx" ON "customer_notification" ("event_type");--> statement-breakpoint
CREATE INDEX "customer_notification_createdAt_idx" ON "customer_notification" ("created_at");--> statement-breakpoint
ALTER TABLE "customer_notification" ADD CONSTRAINT "customer_notification_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customer_notification" ADD CONSTRAINT "customer_notification_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT;