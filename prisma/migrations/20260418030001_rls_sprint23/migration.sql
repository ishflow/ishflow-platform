-- Sprint 23 RLS: tenant isolation for attachment.
-- Mirrors the rls_sprint8 pattern: tenant isolation policy gated by
-- app.tenant_id, plus a superuser bypass gated by app.bypass_rls.

ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment FORCE ROW LEVEL SECURITY;

CREATE POLICY attachment_tenant_isolation ON attachment
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY attachment_superuser_bypass ON attachment
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
