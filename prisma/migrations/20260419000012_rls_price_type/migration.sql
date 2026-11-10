-- Sprint 30: RLS for catalog_sales_price_type
ALTER TABLE catalog_sales_price_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sales_price_type FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_sales_price_type_tenant_isolation
  ON catalog_sales_price_type
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_sales_price_type_superuser_bypass
  ON catalog_sales_price_type
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
