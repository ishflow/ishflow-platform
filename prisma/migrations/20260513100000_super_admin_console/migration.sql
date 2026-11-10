-- Add Tenant.lastActivityAt
ALTER TABLE "tenant" ADD COLUMN "last_activity_at" TIMESTAMP(3);
CREATE INDEX "tenant_last_activity_at_idx" ON "tenant"("last_activity_at");

-- PlatformAuditLog (no RLS — global table)
CREATE TABLE "platform_audit_log" (
    "id" UUID NOT NULL,
    "actor_clerk_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tenant_id" UUID,
    "target_user_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_audit_log_created_at_idx" ON "platform_audit_log"("created_at");
CREATE INDEX "platform_audit_log_actor_clerk_id_created_at_idx" ON "platform_audit_log"("actor_clerk_id", "created_at");
CREATE INDEX "platform_audit_log_tenant_id_created_at_idx" ON "platform_audit_log"("tenant_id", "created_at");
