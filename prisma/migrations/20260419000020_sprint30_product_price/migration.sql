-- Sprint 30 (1C alignment): product_price catalog — historical per-(product, priceType) price list.
-- CreateTable
CREATE TABLE "catalog_inventory_product_price" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product" UUID NOT NULL,
    "priceType" UUID NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_inventory_product_price_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_inventory_product_price_tenant_id_idx" ON "catalog_inventory_product_price"("tenant_id");

-- CreateIndex
CREATE INDEX "catalog_inventory_product_price_tenant_id_deleted_at_idx" ON "catalog_inventory_product_price"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_inventory_product_price_tenant_id_created_at_idx" ON "catalog_inventory_product_price"("tenant_id", "created_at");
