-- AlterTable
ALTER TABLE "catalog_inventory_product" ADD COLUMN "barcode" TEXT,
ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'pcs';

-- CreateIndex
CREATE INDEX "catalog_inventory_product_tenant_id_barcode_idx" ON "catalog_inventory_product"("tenant_id", "barcode");
