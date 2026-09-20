CREATE TYPE "customer_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"notes" text,
	"status" "customer_status" DEFAULT 'ACTIVE'::"customer_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "customer_organizationId_idx" ON "customer" ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customer" ("phone");--> statement-breakpoint
CREATE INDEX "customer_email_idx" ON "customer" ("email");--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;