-- prisma/migrations/20260521140100_rls_treasury_kassa/migration.sql
-- Row-level security for treasury.cash_register catalog + treasury.cash_funds register.
-- Follows the pattern used in 20260521120200_rls_purchase_return.

ALTER TABLE catalog_treasury_cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_treasury_cash_register FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_treasury_cash_register_tenant_isolation
  ON catalog_treasury_cash_register
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_treasury_cash_register_superuser_bypass
  ON catalog_treasury_cash_register
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

ALTER TABLE movement_treasury_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_treasury_cash_funds FORCE ROW LEVEL SECURITY;

CREATE POLICY movement_treasury_cash_funds_tenant_isolation
  ON movement_treasury_cash_funds
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY movement_treasury_cash_funds_superuser_bypass
  ON movement_treasury_cash_funds
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
