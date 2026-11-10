-- Sprint 30: RLS for catalog_sales_price_agreement
ALTER TABLE catalog_sales_price_agreement ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sales_price_agreement FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_sales_price_agreement_tenant_isolation
  ON catalog_sales_price_agreement
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_sales_price_agreement_superuser_bypass
  ON catalog_sales_price_agreement
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

CREATE INDEX IF NOT EXISTS catalog_sales_price_agreement_resolver_idx
  ON catalog_sales_price_agreement ("tenant_id", "product", "counterparty", "validFrom" DESC);
