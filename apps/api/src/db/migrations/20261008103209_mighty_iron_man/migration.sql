CREATE TYPE "job_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "job_status" AS ENUM('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"request_id" text NOT NULL CONSTRAINT "job_request_uidx" UNIQUE,
	"title" text NOT NULL,
	"description" text,
	"priority" "job_priority" DEFAULT 'MEDIUM'::"job_priority" NOT NULL,
	"status" "job_status" DEFAULT 'DRAFT'::"job_status" NOT NULL,
	"location" text,
	"estimated_duration" integer,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"completed_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "job_organizationId_idx" ON "job" ("organization_id");--> statement-breakpoint
CREATE INDEX "job_customerId_idx" ON "job" ("customer_id");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job" ("status");--> statement-breakpoint
CREATE INDEX "job_priority_idx" ON "job" ("priority");--> statement-breakpoint
CREATE INDEX "job_createdAt_idx" ON "job" ("created_at");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_request_id_service_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_request"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE CASCADE;