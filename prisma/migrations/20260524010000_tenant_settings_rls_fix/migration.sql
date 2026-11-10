-- Bring tenant_settings + user_settings RLS policies in line with the
-- codebase convention: UUID cast on the session var, and a WITH CHECK
-- clause so INSERT/UPDATE can't smuggle a different tenant_id past the
-- USING filter (USING only guards reads + deletes).
DROP POLICY IF EXISTS tenant_settings_tenant_isolation ON tenant_settings;
DROP POLICY IF EXISTS user_settings_user_isolation ON user_settings;

CREATE POLICY tenant_settings_tenant_isolation ON tenant_settings
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY user_settings_user_isolation ON user_settings
  USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);
