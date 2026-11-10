-- prisma/migrations/20260521120200_rls_purchase_return/migration.sql

ALTER TABLE document_purchases_return_purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_purchases_return_purchase FORCE ROW LEVEL SECURITY;

CREATE POLICY document_purchases_return_purchase_tenant_isolation
  ON document_purchases_return_purchase
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_purchases_return_purchase_superuser_bypass
  ON document_purchases_return_purchase
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

ALTER TABLE document_line_purchases_return_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_line_purchases_return_purchase_items FORCE ROW LEVEL SECURITY;

CREATE POLICY document_line_purchases_return_purchase_items_tenant_isolation
  ON document_line_purchases_return_purchase_items
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_line_purchases_return_purchase_items_superuser_bypass
  ON document_line_purchases_return_purchase_items
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
