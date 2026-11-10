-- CreateTable: platform.currency catalog with enabled toggle (Sprint 29)
-- Additive only — no drops, no renames.

CREATE TABLE "catalog_platform_currency" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "enabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_platform_currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_platform_currency_tenant_id_idx" ON "catalog_platform_currency"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_platform_currency_tenant_id_deleted_at_idx" ON "catalog_platform_currency"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_platform_currency_tenant_id_created_at_idx" ON "catalog_platform_currency"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "catalog_platform_currency_tenant_id_code_idx" ON "catalog_platform_currency"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_platform_currency_tenant_id_code_key" ON "catalog_platform_currency"("tenant_id", "code");
