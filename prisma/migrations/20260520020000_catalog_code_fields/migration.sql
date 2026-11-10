-- Catalog code fields — 6 entities, additive with backfill.
-- Pattern mirrors the runtime UUID-slice (UPPER substring 8 chars) used by
-- platform/engine/crud.ts:159 for autoGenerate='sequence'.

-- 1. sales.customer
ALTER TABLE "catalog_sales_customer" ADD COLUMN "code" TEXT;
UPDATE "catalog_sales_customer" SET "code" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE "code" IS NULL;
ALTER TABLE "catalog_sales_customer" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "catalog_sales_customer_tenant_id_code_key" ON "catalog_sales_customer"("tenant_id", "code");

-- 2. purchases.supplier
ALTER TABLE "catalog_purchases_supplier" ADD COLUMN "code" TEXT;
UPDATE "catalog_purchases_supplier" SET "code" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE "code" IS NULL;
ALTER TABLE "catalog_purchases_supplier" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "catalog_purchases_supplier_tenant_id_code_key" ON "catalog_purchases_supplier"("tenant_id", "code");

-- 3. sales.price_type
ALTER TABLE "catalog_sales_price_type" ADD COLUMN "code" TEXT;
UPDATE "catalog_sales_price_type" SET "code" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE "code" IS NULL;
ALTER TABLE "catalog_sales_price_type" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "catalog_sales_price_type_tenant_id_code_key" ON "catalog_sales_price_type"("tenant_id", "code");

-- 4. inventory.product_category
ALTER TABLE "catalog_inventory_product_category" ADD COLUMN "code" TEXT;
UPDATE "catalog_inventory_product_category" SET "code" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE "code" IS NULL;
ALTER TABLE "catalog_inventory_product_category" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "catalog_inventory_product_category_tenant_id_code_key" ON "catalog_inventory_product_category"("tenant_id", "code");

-- 5. inventory.product_group
ALTER TABLE "catalog_inventory_product_group" ADD COLUMN "code" TEXT;
UPDATE "catalog_inventory_product_group" SET "code" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE "code" IS NULL;
ALTER TABLE "catalog_inventory_product_group" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "catalog_inventory_product_group_tenant_id_code_key" ON "catalog_inventory_product_group"("tenant_id", "code");

-- 6. sales.price_agreement
ALTER TABLE "catalog_sales_price_agreement" ADD COLUMN "code" TEXT;
UPDATE "catalog_sales_price_agreement" SET "code" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE "code" IS NULL;
ALTER TABLE "catalog_sales_price_agreement" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "catalog_sales_price_agreement_tenant_id_code_key" ON "catalog_sales_price_agreement"("tenant_id", "code");
