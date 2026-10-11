CREATE TYPE "job_photo_kind" AS ENUM('BEFORE', 'AFTER', 'OTHER');--> statement-breakpoint
CREATE TYPE "job_activity_action" AS ENUM('STATUS_CHANGED', 'NOTE_ADDED', 'PHOTO_UPLOADED', 'COMPLETED');--> statement-breakpoint
ALTER TYPE "job_status" ADD VALUE 'EN_ROUTE' BEFORE 'IN_PROGRESS';--> statement-breakpoint
ALTER TYPE "job_status" ADD VALUE 'ARRIVED' BEFORE 'IN_PROGRESS';--> statement-breakpoint
CREATE TABLE "job_note" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"body" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_note" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_photo" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"kind" "job_photo_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_photo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_activity" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"action" "job_activity_action" NOT NULL,
	"from_status" "job_status",
	"to_status" "job_status",
	"message" text,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "completion_summary" text;--> statement-breakpoint
CREATE INDEX "job_note_organizationId_idx" ON "job_note" ("organization_id");--> statement-breakpoint
CREATE INDEX "job_note_jobId_idx" ON "job_note" ("job_id");--> statement-breakpoint
CREATE INDEX "job_note_createdAt_idx" ON "job_note" ("created_at");--> statement-breakpoint
CREATE INDEX "job_photo_organizationId_idx" ON "job_photo" ("organization_id");--> statement-breakpoint
CREATE INDEX "job_photo_jobId_idx" ON "job_photo" ("job_id");--> statement-breakpoint
CREATE INDEX "job_photo_kind_idx" ON "job_photo" ("kind");--> statement-breakpoint
CREATE INDEX "job_photo_createdAt_idx" ON "job_photo" ("created_at");--> statement-breakpoint
CREATE INDEX "job_activity_organizationId_idx" ON "job_activity" ("organization_id");--> statement-breakpoint
CREATE INDEX "job_activity_jobId_idx" ON "job_activity" ("job_id");--> statement-breakpoint
CREATE INDEX "job_activity_createdAt_idx" ON "job_activity" ("created_at");--> statement-breakpoint
CREATE INDEX "job_activity_action_idx" ON "job_activity" ("action");--> statement-breakpoint
ALTER TABLE "job_note" ADD CONSTRAINT "job_note_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_note" ADD CONSTRAINT "job_note_job_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_note" ADD CONSTRAINT "job_note_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_photo" ADD CONSTRAINT "job_photo_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_photo" ADD CONSTRAINT "job_photo_job_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_photo" ADD CONSTRAINT "job_photo_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_activity" ADD CONSTRAINT "job_activity_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_activity" ADD CONSTRAINT "job_activity_job_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_activity" ADD CONSTRAINT "job_activity_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE CASCADE;