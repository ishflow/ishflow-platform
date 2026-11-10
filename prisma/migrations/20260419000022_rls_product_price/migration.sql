-- Sprint 30: RLS for catalog_inventory_product_price
ALTER TABLE catalog_inventory_product_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_inventory_product_price FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_inventory_product_price_tenant_isolation
  ON catalog_inventory_product_price
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_inventory_product_price_superuser_bypass
  ON catalog_inventory_product_price
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- Resolver index: latest row per (product, priceType) at a given date
CREATE INDEX IF NOT EXISTS catalog_inventory_product_price_resolver_idx
  ON catalog_inventory_product_price ("tenant_id", product, "priceType", "validFrom" DESC);
