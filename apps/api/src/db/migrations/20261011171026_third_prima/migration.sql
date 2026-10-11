CREATE TYPE "invoice_item_type" AS ENUM('LABOR', 'PARTS', 'OTHER', 'FEE');--> statement-breakpoint
CREATE TYPE "invoice_status" AS ENUM('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"job_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT'::"invoice_status" NOT NULL,
	"subtotal" numeric(12,2) NOT NULL,
	"discount" numeric(12,2) DEFAULT '0.00' NOT NULL,
	"tax" numeric(12,2) DEFAULT '0.00' NOT NULL,
	"total" numeric(12,2) NOT NULL,
	"amount_paid" numeric(12,2) DEFAULT '0.00' NOT NULL,
	"amount_due" numeric(12,2) NOT NULL,
	"currency" text NOT NULL,
	"issued_at" timestamp,
	"due_at" timestamp,
	"paid_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_org_number_uidx" UNIQUE("organization_id","invoice_number")
);
--> statement-breakpoint
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" text PRIMARY KEY,
	"invoice_id" text NOT NULL,
	"type" "invoice_item_type" NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12,2) NOT NULL,
	"unit_price" numeric(12,2) NOT NULL,
	"amount" numeric(12,2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_job_active_uidx" ON "invoice" ("job_id") WHERE "status" <> 'VOID';--> statement-breakpoint
CREATE INDEX "invoice_organizationId_idx" ON "invoice" ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_customerId_idx" ON "invoice" ("customer_id");--> statement-breakpoint
CREATE INDEX "invoice_jobId_idx" ON "invoice" ("job_id");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" ("status");--> statement-breakpoint
CREATE INDEX "invoice_dueAt_idx" ON "invoice" ("due_at");--> statement-breakpoint
CREATE INDEX "invoice_createdAt_idx" ON "invoice" ("created_at");--> statement-breakpoint
CREATE INDEX "invoice_item_invoiceId_idx" ON "invoice_item" ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_item_type_idx" ON "invoice_item" ("type");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_job_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE;