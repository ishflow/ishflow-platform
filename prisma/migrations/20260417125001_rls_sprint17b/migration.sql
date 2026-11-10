-- Sprint 17b RLS: tenant isolation for movement_sales_sale.
-- Mirrors the rls_sprint8 pattern: tenant isolation policy gated by
-- app.tenant_id, plus a superuser bypass gated by app.bypass_rls.

ALTER TABLE movement_sales_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_sales_sale FORCE ROW LEVEL SECURITY;

CREATE POLICY movement_sales_sale_tenant_isolation ON movement_sales_sale
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY movement_sales_sale_superuser_bypass ON movement_sales_sale
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
