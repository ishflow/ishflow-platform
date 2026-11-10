-- CreateEnum
CREATE TYPE "bank_row_direction" AS ENUM ('in', 'out');
CREATE TYPE "bank_row_status" AS ENUM ('pending', 'matched', 'confirmed', 'ignored', 'conflict');

-- CreateTable: bank_account
CREATE TABLE "bank_account" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_no" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "bic" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_account_tenant_id_account_no_key" ON "bank_account"("tenant_id", "account_no");
CREATE INDEX "bank_account_tenant_id_idx" ON "bank_account"("tenant_id");

ALTER TABLE "bank_account"
  ADD CONSTRAINT "bank_account_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: bank_statement_import
CREATE TABLE "bank_statement_import" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "imported_by_id" UUID NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachment_id" UUID,

    CONSTRAINT "bank_statement_import_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_statement_import_tenant_id_imported_at_idx" ON "bank_statement_import"("tenant_id", "imported_at");

ALTER TABLE "bank_statement_import"
  ADD CONSTRAINT "bank_statement_import_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_statement_import"
  ADD CONSTRAINT "bank_statement_import_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "bank_statement_import"
  ADD CONSTRAINT "bank_statement_import_attachment_id_fkey"
  FOREIGN KEY ("attachment_id") REFERENCES "attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: bank_statement_row
CREATE TABLE "bank_statement_row" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "value_date" TIMESTAMP(3) NOT NULL,
    "direction" "bank_row_direction" NOT NULL,
    "amount" DECIMAL(18, 2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "counterparty_name" TEXT,
    "counterparty_account" TEXT,
    "counterparty_inn" TEXT,
    "narrative" TEXT,
    "external_id" TEXT,
    "status" "bank_row_status" NOT NULL DEFAULT 'pending',
    "match_confidence" DECIMAL(4, 3),
    "matched_doc_id" UUID,
    "matched_doc_type" TEXT,
    "payment_doc_id" UUID,
    "payment_doc_type" TEXT,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "bank_statement_row_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_statement_row_tenant_id_external_id_key" ON "bank_statement_row"("tenant_id", "external_id");
CREATE INDEX "bank_statement_row_tenant_id_status_idx" ON "bank_statement_row"("tenant_id", "status");
CREATE INDEX "bank_statement_row_import_id_idx" ON "bank_statement_row"("import_id");

ALTER TABLE "bank_statement_row"
  ADD CONSTRAINT "bank_statement_row_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_statement_row"
  ADD CONSTRAINT "bank_statement_row_import_id_fkey"
  FOREIGN KEY ("import_id") REFERENCES "bank_statement_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_statement_row"
  ADD CONSTRAINT "bank_statement_row_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- RLS: bank_account
ALTER TABLE bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account FORCE ROW LEVEL SECURITY;
CREATE POLICY bank_account_tenant_isolation ON bank_account
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY bank_account_superuser_bypass ON bank_account
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- RLS: bank_statement_import
ALTER TABLE bank_statement_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_import FORCE ROW LEVEL SECURITY;
CREATE POLICY bank_statement_import_tenant_isolation ON bank_statement_import
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY bank_statement_import_superuser_bypass ON bank_statement_import
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');

-- RLS: bank_statement_row
ALTER TABLE bank_statement_row ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_row FORCE ROW LEVEL SECURITY;
CREATE POLICY bank_statement_row_tenant_isolation ON bank_statement_row
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());
CREATE POLICY bank_statement_row_superuser_bypass ON bank_statement_row
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
