-- Sprint 11 RLS: tenant isolation for purchases tables.
-- Mirrors the rls_sprint8 pattern.

-- catalog_purchases_supplier
ALTER TABLE catalog_purchases_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_purchases_supplier FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_purchases_supplier_tenant_isolation ON catalog_purchases_supplier
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_purchases_supplier_superuser_bypass ON catalog_purchases_supplier
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- document_purchases_invoice
ALTER TABLE document_purchases_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_purchases_invoice FORCE ROW LEVEL SECURITY;

CREATE POLICY document_purchases_invoice_tenant_isolation ON document_purchases_invoice
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_purchases_invoice_superuser_bypass ON document_purchases_invoice
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- document_line_purchases_invoice_items
ALTER TABLE document_line_purchases_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_line_purchases_invoice_items FORCE ROW LEVEL SECURITY;

CREATE POLICY document_line_purchases_invoice_items_tenant_isolation ON document_line_purchases_invoice_items
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_line_purchases_invoice_items_superuser_bypass ON document_line_purchases_invoice_items
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- movement_purchases_accounts_payable
ALTER TABLE movement_purchases_accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_purchases_accounts_payable FORCE ROW LEVEL SECURITY;

CREATE POLICY movement_purchases_accounts_payable_tenant_isolation ON movement_purchases_accounts_payable
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY movement_purchases_accounts_payable_superuser_bypass ON movement_purchases_accounts_payable
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
