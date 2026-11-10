-- RLS for product taxonomies (product_category, product_group)

-- catalog_inventory_product_category
ALTER TABLE catalog_inventory_product_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_inventory_product_category FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_inventory_product_category_tenant_isolation
  ON catalog_inventory_product_category
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_inventory_product_category_superuser_bypass
  ON catalog_inventory_product_category
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- catalog_inventory_product_group
ALTER TABLE catalog_inventory_product_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_inventory_product_group FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_inventory_product_group_tenant_isolation
  ON catalog_inventory_product_group
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_inventory_product_group_superuser_bypass
  ON catalog_inventory_product_group
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
