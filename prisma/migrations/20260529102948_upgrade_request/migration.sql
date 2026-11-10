-- CreateTable
-- Platform-level table, NO RLS — written via withBypass with tenant_id set from
-- the verified server context (mirrors support_ticket). Intentionally has no
-- ENABLE ROW LEVEL SECURITY / CREATE POLICY. Read by the super-admin console.
CREATE TABLE "upgrade_request" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "company_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "requested_plan" "TenantPlan",
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_clerk_id" TEXT,
    "approved_plan" "TenantPlan",
    "payment_method" TEXT,
    "payment_amount" DECIMAL(18,2),
    "payment_currency" TEXT,
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upgrade_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upgrade_request_status_created_at_idx" ON "upgrade_request"("status", "created_at");

-- CreateIndex
CREATE INDEX "upgrade_request_tenant_id_idx" ON "upgrade_request"("tenant_id");
