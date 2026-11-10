-- Sprint 29 RLS: tenant isolation for catalog_platform_currency.
-- Mirrors the rls_sprint24 pattern: tenant isolation policy gated by
-- app.tenant_id, plus a superuser bypass gated by app.bypass_rls.

ALTER TABLE catalog_platform_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_platform_currency FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_platform_currency_tenant_isolation ON catalog_platform_currency
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_platform_currency_superuser_bypass ON catalog_platform_currency
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
