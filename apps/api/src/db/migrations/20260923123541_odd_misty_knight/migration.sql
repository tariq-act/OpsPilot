CREATE TYPE "organization_invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "organization_invitation" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "organization_member_role" NOT NULL,
	"status" "organization_invitation_status" DEFAULT 'PENDING'::"organization_invitation_status" NOT NULL,
	"token" text NOT NULL UNIQUE,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_invitation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "organization_invitation_organizationId_idx" ON "organization_invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_invitation_email_idx" ON "organization_invitation" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitation_org_email_pending_uidx" ON "organization_invitation" ("organization_id","email") WHERE "status" = 'PENDING';--> statement-breakpoint
ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_invited_by_user_id_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_accepted_user_id_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "user"("id") ON DELETE SET NULL;