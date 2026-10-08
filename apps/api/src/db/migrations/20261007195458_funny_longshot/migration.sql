CREATE TYPE "service_request_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "service_request_source" AS ENUM('PHONE', 'EMAIL', 'WEBSITE', 'WALK_IN', 'WHATSAPP', 'OTHER');--> statement-breakpoint
CREATE TYPE "service_request_status" AS ENUM('NEW', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "service_request" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" "service_request_priority" DEFAULT 'MEDIUM'::"service_request_priority" NOT NULL,
	"status" "service_request_status" DEFAULT 'NEW'::"service_request_status" NOT NULL,
	"source" "service_request_source" DEFAULT 'OTHER'::"service_request_source" NOT NULL,
	"preferred_date" timestamp,
	"preferred_time" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "service_request_organizationId_idx" ON "service_request" ("organization_id");--> statement-breakpoint
CREATE INDEX "service_request_customerId_idx" ON "service_request" ("customer_id");--> statement-breakpoint
CREATE INDEX "service_request_status_idx" ON "service_request" ("status");--> statement-breakpoint
CREATE INDEX "service_request_priority_idx" ON "service_request" ("priority");--> statement-breakpoint
CREATE INDEX "service_request_createdAt_idx" ON "service_request" ("created_at");--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE CASCADE;