-- Sprint 20: period close table + RLS.

CREATE TABLE IF NOT EXISTS period_close (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  module          TEXT NOT NULL,
  closed_through  TIMESTAMP(3) NOT NULL,
  closed_by       UUID NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(3) NOT NULL,
  CONSTRAINT period_close_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
  CONSTRAINT period_close_user_fkey   FOREIGN KEY (closed_by) REFERENCES "user"(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS period_close_tenant_id_module_key
  ON period_close(tenant_id, module);
CREATE INDEX IF NOT EXISTS period_close_tenant_id_idx
  ON period_close(tenant_id);

ALTER TABLE period_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_close FORCE ROW LEVEL SECURITY;

CREATE POLICY period_close_tenant_isolation ON period_close
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY period_close_superuser_bypass ON period_close
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
