CREATE TYPE "technician_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "technician" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"employee_code" text NOT NULL,
	"phone" text,
	"bio" text,
	"status" "technician_status" DEFAULT 'ACTIVE'::"technician_status" NOT NULL,
	"hire_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technician_org_user_uidx" UNIQUE("organization_id","user_id"),
	CONSTRAINT "technician_org_employee_code_uidx" UNIQUE("organization_id","employee_code")
);
--> statement-breakpoint
ALTER TABLE "technician" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "technician_organizationId_idx" ON "technician" ("organization_id");--> statement-breakpoint
CREATE INDEX "technician_userId_idx" ON "technician" ("user_id");--> statement-breakpoint
CREATE INDEX "technician_status_idx" ON "technician" ("status");--> statement-breakpoint
CREATE INDEX "technician_employeeCode_idx" ON "technician" ("employee_code");--> statement-breakpoint
ALTER TABLE "technician" ADD CONSTRAINT "technician_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "technician" ADD CONSTRAINT "technician_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;