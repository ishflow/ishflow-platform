-- tenant_settings: one row per (tenant, key); JSON payload.
CREATE TABLE tenant_settings (
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, key)
);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_tenant_isolation ON tenant_settings
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- user_settings: one row per (user, key); JSON payload. No tenant scoping —
-- user prefs are global to the user identity (Clerk user_id).
CREATE TABLE user_settings (
  user_id    UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

-- user_settings RLS gates by Clerk user identity — set via SET LOCAL
-- app.user_id in withTenant / withUser wrappers (extend if needed).
CREATE POLICY user_settings_user_isolation ON user_settings
  USING (user_id::text = current_setting('app.user_id', true));
