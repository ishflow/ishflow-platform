-- Sprint 12 RLS: tenant isolation for the new payment_sent document.
-- Mirrors the rls_sprint11 pattern (app_current_tenant_id() + bypass via SET LOCAL).

-- document_purchases_payment_sent
ALTER TABLE document_purchases_payment_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_purchases_payment_sent FORCE ROW LEVEL SECURITY;

CREATE POLICY document_purchases_payment_sent_tenant_isolation ON document_purchases_payment_sent
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_purchases_payment_sent_superuser_bypass ON document_purchases_payment_sent
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
