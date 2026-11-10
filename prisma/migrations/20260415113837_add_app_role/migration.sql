-- Non-superuser application role. RLS applies to this role.
-- Migrations still run as `canalog` (DIRECT_URL); runtime queries use `canalog_app` (DATABASE_URL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'canalog_app') THEN
    CREATE ROLE canalog_app WITH LOGIN PASSWORD 'canalog_app_dev_password';
  END IF;
END $$;

-- Schema + sequence access
GRANT USAGE ON SCHEMA public TO canalog_app;

-- Existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO canalog_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO canalog_app;

-- Future tables get the same grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO canalog_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO canalog_app;

-- Allow the app role to call our RLS helper function
GRANT EXECUTE ON FUNCTION app_current_tenant_id() TO canalog_app;
