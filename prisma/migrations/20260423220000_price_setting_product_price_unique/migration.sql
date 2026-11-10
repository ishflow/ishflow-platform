-- Make catalog_inventory_product_price match the Prisma schema:
-- * priceType + price columns (restore after Sprint 33 over-correction)
-- * compound unique with Prisma canonical constraint name
-- * RLS on the two price-setting document tables (tenant isolation + bypass)
--
-- Every statement is idempotent so re-running against a partially-migrated
-- dev DB is safe.

-- 1. priceType + price columns
ALTER TABLE "catalog_inventory_product_price"
  ADD COLUMN IF NOT EXISTS "priceType" UUID,
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(14, 2);

-- 2. Compound unique for the posting upsert (tenantId_product_validFrom)
DROP INDEX IF EXISTS "catalog_inventory_product_price_tenant_product_date_idx";
DROP INDEX IF EXISTS "catalog_inventory_product_price_tenant_id_product_validFrom_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_inventory_product_price_tenant_id_product_validFrom_key"
  ON "catalog_inventory_product_price" ("tenant_id", "product", "validFrom");

-- 3. RLS on document_inventory_price_setting (table created by Prisma generator;
--    guard with IF EXISTS so a clean `migrate reset` doesn't crash before the
--    document table has been bootstrapped — consistent with the pattern in
--    20260423_price_setting_cols).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_inventory_price_setting') THEN
    EXECUTE 'ALTER TABLE "document_inventory_price_setting" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "document_inventory_price_setting" FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "document_inventory_price_setting_tenant_isolation" ON "document_inventory_price_setting"';
    EXECUTE 'CREATE POLICY "document_inventory_price_setting_tenant_isolation" ON "document_inventory_price_setting" USING ("tenant_id" = app_current_tenant_id()) WITH CHECK ("tenant_id" = app_current_tenant_id())';
    EXECUTE 'DROP POLICY IF EXISTS "document_inventory_price_setting_superuser_bypass" ON "document_inventory_price_setting"';
    EXECUTE 'CREATE POLICY "document_inventory_price_setting_superuser_bypass" ON "document_inventory_price_setting" USING (current_setting(''app.bypass_rls'', true) = ''on'') WITH CHECK (current_setting(''app.bypass_rls'', true) = ''on'')';
  END IF;
END $$;

-- 4. RLS on document_line_inventory_price_setting_items (same guard pattern)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_line_inventory_price_setting_items') THEN
    EXECUTE 'ALTER TABLE "document_line_inventory_price_setting_items" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE "document_line_inventory_price_setting_items" FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "document_line_inventory_price_setting_items_tenant_isolation" ON "document_line_inventory_price_setting_items"';
    EXECUTE 'CREATE POLICY "document_line_inventory_price_setting_items_tenant_isolation" ON "document_line_inventory_price_setting_items" USING ("tenant_id" = app_current_tenant_id()) WITH CHECK ("tenant_id" = app_current_tenant_id())';
    EXECUTE 'DROP POLICY IF EXISTS "document_line_inventory_price_setting_items_superuser_bypass" ON "document_line_inventory_price_setting_items";';
    EXECUTE 'CREATE POLICY "document_line_inventory_price_setting_items_superuser_bypass" ON "document_line_inventory_price_setting_items" USING (current_setting(''app.bypass_rls'', true) = ''on'') WITH CHECK (current_setting(''app.bypass_rls'', true) = ''on'')';
  END IF;
END $$;
