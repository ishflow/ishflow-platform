-- prisma/migrations/20260521140000_treasury_kassa/migration.sql
-- treasury.cash_register catalog + treasury.cash_funds register + cash_register column on payment docs.

CREATE TABLE catalog_treasury_cash_register (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  note       TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT catalog_treasury_cash_register_tenantId_code_key
    UNIQUE (tenant_id, code)
);

CREATE INDEX catalog_treasury_cash_register_tenantId_idx
  ON catalog_treasury_cash_register (tenant_id);
CREATE INDEX catalog_treasury_cash_register_tenantId_deletedAt_idx
  ON catalog_treasury_cash_register (tenant_id, deleted_at);
CREATE INDEX catalog_treasury_cash_register_tenantId_createdAt_idx
  ON catalog_treasury_cash_register (tenant_id, created_at);
CREATE INDEX catalog_treasury_cash_register_tenantId_name_idx
  ON catalog_treasury_cash_register (tenant_id, name);

CREATE TABLE movement_treasury_cash_funds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  doc_ref         UUID NOT NULL,
  doc_type        TEXT NOT NULL,
  kind            TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  timestamp       TIMESTAMP(3) NOT NULL,
  cash_register   UUID NOT NULL,
  related_doc_ref UUID NULL,
  amount          NUMERIC(14, 2) NOT NULL,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX movement_treasury_cash_funds_tenantId_idx
  ON movement_treasury_cash_funds (tenant_id);
CREATE INDEX movement_treasury_cash_funds_tenantId_active_idx
  ON movement_treasury_cash_funds (tenant_id, active);
CREATE INDEX movement_treasury_cash_funds_tenantId_docRef_idx
  ON movement_treasury_cash_funds (tenant_id, doc_ref);
CREATE INDEX movement_treasury_cash_funds_tenantId_active_timestamp_idx
  ON movement_treasury_cash_funds (tenant_id, active, timestamp);
CREATE INDEX movement_treasury_cash_funds_tenantId_cashReg_timestamp_idx
  ON movement_treasury_cash_funds (tenant_id, cash_register, timestamp);

ALTER TABLE document_sales_payment_received
  ADD COLUMN cash_register UUID NULL;
CREATE INDEX document_sales_payment_received_tenantId_cashReg_idx
  ON document_sales_payment_received (tenant_id, cash_register);

ALTER TABLE document_purchases_payment_sent
  ADD COLUMN cash_register UUID NULL;
CREATE INDEX document_purchases_payment_sent_tenantId_cashReg_idx
  ON document_purchases_payment_sent (tenant_id, cash_register);
