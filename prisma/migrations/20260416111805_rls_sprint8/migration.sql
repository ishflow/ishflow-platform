-- Sprint 8 RLS: tenant isolation for new per-tenant tables.
-- Mirrors the rls_sprint3 pattern: tenant isolation policy gated by
-- app.tenant_id, plus a superuser bypass gated by app.bypass_rls.

-- document_sales_payment_received
ALTER TABLE document_sales_payment_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sales_payment_received FORCE ROW LEVEL SECURITY;

CREATE POLICY document_sales_payment_received_tenant_isolation ON document_sales_payment_received
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_sales_payment_received_superuser_bypass ON document_sales_payment_received
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- movement_sales_accounts_receivable
ALTER TABLE movement_sales_accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_sales_accounts_receivable FORCE ROW LEVEL SECURITY;

CREATE POLICY movement_sales_accounts_receivable_tenant_isolation ON movement_sales_accounts_receivable
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY movement_sales_accounts_receivable_superuser_bypass ON movement_sales_accounts_receivable
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
