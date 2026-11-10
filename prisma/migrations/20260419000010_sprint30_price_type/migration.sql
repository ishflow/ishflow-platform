-- Sprint 30 (1C alignment): price_type catalog — named price tiers with optional default markup.
-- CreateTable
CREATE TABLE "catalog_sales_price_type" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "markupPct" DECIMAL(5,4),
    "isDefault" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_sales_price_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sales_price_type_tenant_id_name_key" ON "catalog_sales_price_type"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "catalog_sales_price_type_tenant_id_idx" ON "catalog_sales_price_type"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_sales_price_type_tenant_id_deleted_at_idx" ON "catalog_sales_price_type"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_sales_price_type_tenant_id_created_at_idx" ON "catalog_sales_price_type"("tenant_id", "created_at");
