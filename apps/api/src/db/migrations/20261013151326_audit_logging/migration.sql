CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "audit_log_organizationId_idx" ON "audit_log" ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log" ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" ("action");--> statement-breakpoint
CREATE INDEX "audit_log_entityType_idx" ON "audit_log" ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_log_entityId_idx" ON "audit_log" ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_org_created_idx" ON "audit_log" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_org_entity_idx" ON "audit_log" ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actorUserId_idx" ON "audit_log" ("actor_user_id");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;