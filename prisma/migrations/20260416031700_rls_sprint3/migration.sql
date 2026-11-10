-- Sprint 3 RLS: tenant isolation for new per-tenant tables.
-- Pattern mirrors rls_catalog_sales_customer: a tenant isolation policy
-- gated by app.tenant_id, plus a superuser bypass gated by app.bypass_rls.

-- catalog_inventory_product
ALTER TABLE catalog_inventory_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_inventory_product FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_inventory_product_tenant_isolation ON catalog_inventory_product
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_inventory_product_superuser_bypass ON catalog_inventory_product
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- document_sales_invoice
ALTER TABLE document_sales_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sales_invoice FORCE ROW LEVEL SECURITY;

CREATE POLICY document_sales_invoice_tenant_isolation ON document_sales_invoice
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_sales_invoice_superuser_bypass ON document_sales_invoice
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- movement_inventory_stock_balance
ALTER TABLE movement_inventory_stock_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_inventory_stock_balance FORCE ROW LEVEL SECURITY;

CREATE POLICY movement_inventory_stock_balance_tenant_isolation ON movement_inventory_stock_balance
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY movement_inventory_stock_balance_superuser_bypass ON movement_inventory_stock_balance
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- document_sequence (platform table, tenant-scoped)
ALTER TABLE document_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequence FORCE ROW LEVEL SECURITY;

CREATE POLICY document_sequence_tenant_isolation ON document_sequence
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_sequence_superuser_bypass ON document_sequence
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
