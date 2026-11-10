-- Sprint 19 RLS: tenant isolation for catalog_inventory_warehouse.

ALTER TABLE catalog_inventory_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_inventory_warehouse FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_inventory_warehouse_tenant_isolation ON catalog_inventory_warehouse
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY catalog_inventory_warehouse_superuser_bypass ON catalog_inventory_warehouse
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
