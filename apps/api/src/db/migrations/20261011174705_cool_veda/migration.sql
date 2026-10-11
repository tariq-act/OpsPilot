CREATE TYPE "payment_method" AS ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'ONLINE', 'OTHER');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"currency" text NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" NOT NULL,
	"transaction_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_org_transaction_uidx" ON "payment" ("organization_id","transaction_id") WHERE "transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_organizationId_idx" ON "payment" ("organization_id");--> statement-breakpoint
CREATE INDEX "payment_customerId_idx" ON "payment" ("customer_id");--> statement-breakpoint
CREATE INDEX "payment_invoiceId_idx" ON "payment" ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" ("status");--> statement-breakpoint
CREATE INDEX "payment_paidAt_idx" ON "payment" ("paid_at");--> statement-breakpoint
CREATE INDEX "payment_createdAt_idx" ON "payment" ("created_at");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT;