-- catalog_sales_customer: tenant isolation
ALTER TABLE catalog_sales_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sales_customer FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_sales_customer_tenant_isolation ON catalog_sales_customer
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_sales_customer_superuser_bypass ON catalog_sales_customer
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
