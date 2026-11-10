-- Курсовые разницы (FX gain/loss) accumulation register.

CREATE TABLE IF NOT EXISTS "movement_treasury_fx_pl" (
  "id"                UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID            NOT NULL,
  "doc_ref"           UUID            NOT NULL,
  "doc_type"          TEXT            NOT NULL,
  "kind"              TEXT            NOT NULL,
  "active"            BOOLEAN         NOT NULL DEFAULT TRUE,
  "timestamp"         TIMESTAMP(3)    NOT NULL,
  "account"           UUID,
  "counterparty"      UUID,
  "currency_original" VARCHAR(3)      NOT NULL,
  "amount_original"   DECIMAL(14, 2)  NOT NULL,
  "amount"            DECIMAL(14, 2)  NOT NULL,
  "fx_rate_old"       DECIMAL(18, 8),
  "fx_rate_new"       DECIMAL(18, 8),
  "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "movement_treasury_fx_pl_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "movement_treasury_fx_pl_tenant_id_idx"
  ON "movement_treasury_fx_pl" ("tenant_id");
CREATE INDEX IF NOT EXISTS "movement_treasury_fx_pl_tenant_id_active_idx"
  ON "movement_treasury_fx_pl" ("tenant_id", "active");
CREATE INDEX IF NOT EXISTS "movement_treasury_fx_pl_tenant_id_doc_ref_idx"
  ON "movement_treasury_fx_pl" ("tenant_id", "doc_ref");
CREATE INDEX IF NOT EXISTS "movement_treasury_fx_pl_tenant_id_active_timestamp_idx"
  ON "movement_treasury_fx_pl" ("tenant_id", "active", "timestamp");
CREATE INDEX IF NOT EXISTS "movement_treasury_fx_pl_tenant_id_account_timestamp_idx"
  ON "movement_treasury_fx_pl" ("tenant_id", "account", "timestamp");
CREATE INDEX IF NOT EXISTS "movement_treasury_fx_pl_tenant_id_counterparty_timestamp_idx"
  ON "movement_treasury_fx_pl" ("tenant_id", "counterparty", "timestamp");
