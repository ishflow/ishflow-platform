-- 1C-style information register: periodic price snapshots
CREATE TABLE "register_inventory_product_price" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"      uuid NOT NULL,
  "period"         date NOT NULL,
  "product"        uuid NOT NULL,
  "priceType"      uuid NOT NULL,
  "price"          numeric(18,4) NOT NULL,
  "doc_ref"        uuid,
  "recorder_type"  text,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "deleted_at"     timestamptz
);

CREATE INDEX "register_inventory_product_price_lookup_idx"
  ON "register_inventory_product_price" ("tenant_id", "product", "priceType", "period" DESC)
  WHERE "deleted_at" IS NULL;
CREATE INDEX "register_inventory_product_price_docref_idx"
  ON "register_inventory_product_price" ("tenant_id", "doc_ref");

-- RLS — follow existing project pattern: app_current_tenant_id() helper + bypass policy
ALTER TABLE "register_inventory_product_price" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "register_inventory_product_price" FORCE ROW LEVEL SECURITY;

CREATE POLICY register_inventory_product_price_tenant_isolation
  ON "register_inventory_product_price"
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY register_inventory_product_price_superuser_bypass
  ON "register_inventory_product_price"
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- Customer default price type
ALTER TABLE "catalog_sales_customer"
  ADD COLUMN "default_price_type" uuid REFERENCES "catalog_sales_price_type"("id");

-- Invoice header price type
ALTER TABLE "document_sales_invoice"
  ADD COLUMN "price_type" uuid REFERENCES "catalog_sales_price_type"("id");

-- Drop atrophied product.price (resolver now sources from register; live cost stays in stock_balance)
ALTER TABLE "catalog_inventory_product" DROP COLUMN IF EXISTS "price";

-- Drop the old catalog table — replaced by register
DROP TABLE IF EXISTS "catalog_inventory_product_price" CASCADE;
