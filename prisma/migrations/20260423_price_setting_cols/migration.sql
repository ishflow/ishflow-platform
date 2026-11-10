-- Restore priceType and price columns to catalog_inventory_product_price
ALTER TABLE catalog_inventory_product_price
  ADD COLUMN IF NOT EXISTS "priceType" UUID REFERENCES catalog_sales_price_type(id),
  ADD COLUMN IF NOT EXISTS "price" NUMERIC(14, 2);

-- Unique constraint for upsert by (tenant, product, validFrom)
CREATE UNIQUE INDEX IF NOT EXISTS catalog_inventory_product_price_tenant_product_date_idx
  ON catalog_inventory_product_price ("tenant_id", product, "validFrom");

-- Index for priceType lookups
CREATE INDEX IF NOT EXISTS catalog_inventory_product_price_tenant_price_type_idx
  ON catalog_inventory_product_price ("tenant_id", "priceType");

-- RLS for document_inventory_price_setting (tables created by Prisma generator)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_inventory_price_setting') THEN
    ALTER TABLE document_inventory_price_setting ENABLE ROW LEVEL SECURITY;
    ALTER TABLE document_inventory_price_setting FORCE ROW LEVEL SECURITY;

    CREATE POLICY document_inventory_price_setting_tenant_isolation
      ON document_inventory_price_setting
      USING ("tenant_id" = current_setting('app.current_tenant')::UUID);

    CREATE POLICY document_inventory_price_setting_superuser_bypass
      ON document_inventory_price_setting
      USING (current_setting('app.current_tenant')::TEXT = '00000000-0000-0000-0000-000000000000');
  END IF;
END $$;

-- RLS for document_line_inventory_price_setting_items (tables created by Prisma generator)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_line_inventory_price_setting_items') THEN
    ALTER TABLE document_line_inventory_price_setting_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE document_line_inventory_price_setting_items FORCE ROW LEVEL SECURITY;

    CREATE POLICY document_line_inventory_price_setting_items_tenant_isolation
      ON document_line_inventory_price_setting_items
      USING ("tenant_id" = current_setting('app.current_tenant')::UUID);

    CREATE POLICY document_line_inventory_price_setting_items_superuser_bypass
      ON document_line_inventory_price_setting_items
      USING (current_setting('app.current_tenant')::TEXT = '00000000-0000-0000-0000-000000000000');
  END IF;
END $$;
