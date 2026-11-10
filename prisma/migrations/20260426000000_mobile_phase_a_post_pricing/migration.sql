-- Mobile Phase A — schema + RLS, fresh timestamp post-pricing-register.
-- Consolidates the original 20260418200000_sprint_mobile_api and
-- 20260418200001_rls_sprint_mobile_api migrations from the pre-rebase
-- branch into a single additive migration that lands AFTER current
-- main's 20260425010000_price_setting_doc_tables.
--
-- Adds: Tenant.mobile_features JSON, idempotency_key, device_push_token.
-- Mirrors the rls_sprint29 RLS pattern (FORCE RLS + tenant isolation +
-- superuser bypass via app.bypass_rls).

ALTER TABLE "tenant"
  ADD COLUMN "mobile_features" JSONB;

CREATE TABLE "idempotency_key" (
  "tenant_id" UUID NOT NULL,
  "key" UUID NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" UUID NOT NULL,
  "response_body" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("tenant_id", "key"),
  CONSTRAINT "idempotency_key_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "idempotency_key_tenant_id_created_at_idx"
  ON "idempotency_key" ("tenant_id", "created_at");

CREATE TABLE "device_push_token" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "device_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "device_push_token_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_push_token_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "device_push_token_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "device_push_token_token_key" ON "device_push_token" ("token");
CREATE INDEX "device_push_token_tenant_id_user_id_idx"
  ON "device_push_token" ("tenant_id", "user_id");

-- RLS

ALTER TABLE idempotency_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_key FORCE ROW LEVEL SECURITY;

CREATE POLICY idempotency_key_tenant_isolation ON idempotency_key
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY idempotency_key_superuser_bypass ON idempotency_key
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

ALTER TABLE device_push_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_push_token FORCE ROW LEVEL SECURITY;

CREATE POLICY device_push_token_tenant_isolation ON device_push_token
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY device_push_token_superuser_bypass ON device_push_token
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
