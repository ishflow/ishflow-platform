-- Out-of-band CREATE for tables that schema.prisma has but no migration creates.
-- Idempotent — safe to run multiple times.

CREATE TABLE IF NOT EXISTS "document_inventory_price_setting" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "posted_at" TIMESTAMP(3),
    "posted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "priceType" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "document_inventory_price_setting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_line_inventory_price_setting_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "product" UUID NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_line_inventory_price_setting_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_idx" ON "document_inventory_price_setting"("tenant_id");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_deleted_at_idx" ON "document_inventory_price_setting"("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_status_idx" ON "document_inventory_price_setting"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_posted_at_idx" ON "document_inventory_price_setting"("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_created_at_idx" ON "document_inventory_price_setting"("tenant_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_price_setting_tenant_id_number_key" ON "document_inventory_price_setting"("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "document_line_inventory_price_setting_items_tenant_id_idx" ON "document_line_inventory_price_setting_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "document_line_inventory_price_setting_items_tenant_id_docum_idx" ON "document_line_inventory_price_setting_items"("tenant_id", "document_id");
CREATE UNIQUE INDEX IF NOT EXISTS "document_line_inventory_price_setting_items_tenant_id_docum_key" ON "document_line_inventory_price_setting_items"("tenant_id", "document_id", "sequence");
