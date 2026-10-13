CREATE TYPE "automation_execution_status" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "automation_trigger" AS ENUM('JOB_COMPLETED', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'FOLLOW_UP_DUE');--> statement-breakpoint
ALTER TYPE "notification_event_type" ADD VALUE 'PAYMENT_REMINDER';--> statement-breakpoint
ALTER TYPE "notification_event_type" ADD VALUE 'FOLLOW_UP_DUE';--> statement-breakpoint
CREATE TABLE "automation_execution" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"event_id" text NOT NULL,
	"status" "automation_execution_status" DEFAULT 'PENDING'::"automation_execution_status" NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"idempotency_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "automation_execution_org_idempotency_uidx" UNIQUE("organization_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "automation_execution" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "automation_rule" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_event" "automation_trigger" NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_rule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "automation_execution_organizationId_idx" ON "automation_execution" ("organization_id");--> statement-breakpoint
CREATE INDEX "automation_execution_ruleId_idx" ON "automation_execution" ("rule_id");--> statement-breakpoint
CREATE INDEX "automation_execution_org_rule_created_idx" ON "automation_execution" ("organization_id","rule_id","created_at");--> statement-breakpoint
CREATE INDEX "automation_execution_status_idx" ON "automation_execution" ("status");--> statement-breakpoint
CREATE INDEX "automation_rule_organizationId_idx" ON "automation_rule" ("organization_id");--> statement-breakpoint
CREATE INDEX "automation_rule_org_trigger_active_idx" ON "automation_rule" ("organization_id","trigger_event","is_active");--> statement-breakpoint
CREATE INDEX "automation_rule_createdBy_idx" ON "automation_rule" ("created_by");--> statement-breakpoint
ALTER TABLE "automation_execution" ADD CONSTRAINT "automation_execution_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_execution" ADD CONSTRAINT "automation_execution_rule_id_automation_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rule"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_rule" ADD CONSTRAINT "automation_rule_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_rule" ADD CONSTRAINT "automation_rule_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT;