CREATE TYPE "organization_member_role" AS ENUM('OWNER', 'ADMIN', 'DISPATCHER', 'TECHNICIAN');--> statement-breakpoint
CREATE TYPE "organization_member_status" AS ENUM('ACTIVE', 'INVITED', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"phone" text,
	"email" text,
	"address" text,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization_member" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "organization_member_role" NOT NULL,
	"status" "organization_member_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_member_org_user_uidx" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organization_member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "organization_member_organizationId_idx" ON "organization_member" ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_member_userId_idx" ON "organization_member" ("user_id");--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;