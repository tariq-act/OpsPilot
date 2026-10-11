CREATE TYPE "job_assignment_status" AS ENUM('ASSIGNED', 'RELEASED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "job_assignment" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"technician_id" text NOT NULL,
	"status" "job_assignment_status" DEFAULT 'ASSIGNED'::"job_assignment_status" NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_assignment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "scheduled_start" timestamp;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "scheduled_end" timestamp;--> statement-breakpoint
CREATE INDEX "job_scheduledStart_idx" ON "job" ("scheduled_start");--> statement-breakpoint
CREATE INDEX "job_assignment_organizationId_idx" ON "job_assignment" ("organization_id");--> statement-breakpoint
CREATE INDEX "job_assignment_jobId_idx" ON "job_assignment" ("job_id");--> statement-breakpoint
CREATE INDEX "job_assignment_technicianId_idx" ON "job_assignment" ("technician_id");--> statement-breakpoint
CREATE INDEX "job_assignment_status_idx" ON "job_assignment" ("status");--> statement-breakpoint
CREATE INDEX "job_assignment_assignedAt_idx" ON "job_assignment" ("assigned_at");--> statement-breakpoint
ALTER TABLE "job_assignment" ADD CONSTRAINT "job_assignment_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_assignment" ADD CONSTRAINT "job_assignment_job_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_assignment" ADD CONSTRAINT "job_assignment_technician_id_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technician"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "job_assignment" ADD CONSTRAINT "job_assignment_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by") REFERENCES "user"("id") ON DELETE CASCADE;