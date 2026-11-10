-- Row-level security for movement_treasury_fx_pl: tenant isolation + bypass for the
-- privileged migrator role. Mirrors the policy shape used by every other movement_*
-- table in this project.

ALTER TABLE "movement_treasury_fx_pl" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movement_treasury_fx_pl" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "movement_treasury_fx_pl";
CREATE POLICY "tenant_isolation" ON "movement_treasury_fx_pl"
  FOR ALL TO canalog_app
  USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS "bypass_full" ON "movement_treasury_fx_pl";
CREATE POLICY "bypass_full" ON "movement_treasury_fx_pl"
  FOR ALL TO canalog
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "movement_treasury_fx_pl" TO canalog_app;
