-- Sprint 24 RLS: tenant isolation for saved_view.
-- Mirrors the rls_sprint8 pattern: tenant isolation policy gated by
-- app.tenant_id, plus a superuser bypass gated by app.bypass_rls.

ALTER TABLE saved_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_view FORCE ROW LEVEL SECURITY;

CREATE POLICY saved_view_tenant_isolation ON saved_view
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY saved_view_superuser_bypass ON saved_view
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
