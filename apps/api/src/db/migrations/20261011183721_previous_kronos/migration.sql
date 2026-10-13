CREATE TYPE "follow_up_status" AS ENUM('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "follow_up_type" AS ENUM('FEEDBACK', 'MAINTENANCE_REMINDER');--> statement-breakpoint
CREATE TABLE "customer_follow_up" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"job_id" text,
	"type" "follow_up_type" NOT NULL,
	"status" "follow_up_status" DEFAULT 'PENDING'::"follow_up_status" NOT NULL,
	"due_at" timestamp NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_follow_up" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "customer_follow_up_organizationId_idx" ON "customer_follow_up" ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_follow_up_customerId_idx" ON "customer_follow_up" ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_follow_up_jobId_idx" ON "customer_follow_up" ("job_id");--> statement-breakpoint
CREATE INDEX "customer_follow_up_status_idx" ON "customer_follow_up" ("status");--> statement-breakpoint
CREATE INDEX "customer_follow_up_type_idx" ON "customer_follow_up" ("type");--> statement-breakpoint
CREATE INDEX "customer_follow_up_dueAt_idx" ON "customer_follow_up" ("due_at");--> statement-breakpoint
ALTER TABLE "customer_follow_up" ADD CONSTRAINT "customer_follow_up_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customer_follow_up" ADD CONSTRAINT "customer_follow_up_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "customer_follow_up" ADD CONSTRAINT "customer_follow_up_job_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "customer_follow_up" ADD CONSTRAINT "customer_follow_up_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT;