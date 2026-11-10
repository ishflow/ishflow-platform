-- Phase 5: bank deposit/withdrawal + inventory assembly/disassembly.

CREATE TABLE IF NOT EXISTS "document_treasury_bank_deposit" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID            NOT NULL,
  "number"        TEXT            NOT NULL,
  "status"        TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"     TIMESTAMP(3),
  "posted_by"     UUID,
  "version"       INTEGER         NOT NULL DEFAULT 0,
  "date"          TIMESTAMP(3)    NOT NULL,
  "cash_register" UUID            NOT NULL,
  "bank_account"  UUID            NOT NULL,
  "amount"        DECIMAL(14, 2)  NOT NULL,
  "currency"      VARCHAR(3),
  "fx_rate"       DECIMAL(18, 8),
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  CONSTRAINT "document_treasury_bank_deposit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_bank_deposit_tenant_id_number_key"
  ON "document_treasury_bank_deposit" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_t_bank_deposit_t_idx" ON "document_treasury_bank_deposit" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_t_bank_deposit_t_d_idx" ON "document_treasury_bank_deposit" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_t_bank_deposit_t_s_idx" ON "document_treasury_bank_deposit" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_t_bank_deposit_t_p_idx" ON "document_treasury_bank_deposit" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_t_bank_deposit_t_cr_idx" ON "document_treasury_bank_deposit" ("tenant_id", "cash_register");
CREATE INDEX IF NOT EXISTS "doc_t_bank_deposit_t_ba_idx" ON "document_treasury_bank_deposit" ("tenant_id", "bank_account");

CREATE TABLE IF NOT EXISTS "document_treasury_bank_withdrawal" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID            NOT NULL,
  "number"        TEXT            NOT NULL,
  "status"        TEXT            NOT NULL DEFAULT 'SAVED',
  "posted_at"     TIMESTAMP(3),
  "posted_by"     UUID,
  "version"       INTEGER         NOT NULL DEFAULT 0,
  "date"          TIMESTAMP(3)    NOT NULL,
  "bank_account"  UUID            NOT NULL,
  "cash_register" UUID            NOT NULL,
  "amount"        DECIMAL(14, 2)  NOT NULL,
  "currency"      VARCHAR(3),
  "fx_rate"       DECIMAL(18, 8),
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)    NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  CONSTRAINT "document_treasury_bank_withdrawal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_treasury_bank_withdrawal_tenant_id_number_key"
  ON "document_treasury_bank_withdrawal" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_t_bank_with_t_idx" ON "document_treasury_bank_withdrawal" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_t_bank_with_t_d_idx" ON "document_treasury_bank_withdrawal" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_t_bank_with_t_s_idx" ON "document_treasury_bank_withdrawal" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_t_bank_with_t_p_idx" ON "document_treasury_bank_withdrawal" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_t_bank_with_t_ba_idx" ON "document_treasury_bank_withdrawal" ("tenant_id", "bank_account");
CREATE INDEX IF NOT EXISTS "doc_t_bank_with_t_cr_idx" ON "document_treasury_bank_withdrawal" ("tenant_id", "cash_register");

CREATE TABLE IF NOT EXISTS "document_inventory_assembly" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "number"           TEXT         NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"        TIMESTAMP(3),
  "posted_by"        UUID,
  "version"          INTEGER      NOT NULL DEFAULT 0,
  "date"             TIMESTAMP(3) NOT NULL,
  "warehouse"        UUID         NOT NULL,
  "finished_product" UUID         NOT NULL,
  "finished_qty"     INTEGER      NOT NULL,
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "deleted_at"       TIMESTAMP(3),
  CONSTRAINT "document_inventory_assembly_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_assembly_tenant_id_number_key"
  ON "document_inventory_assembly" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_inv_assembly_t_idx" ON "document_inventory_assembly" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_inv_assembly_t_d_idx" ON "document_inventory_assembly" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_inv_assembly_t_s_idx" ON "document_inventory_assembly" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_inv_assembly_t_p_idx" ON "document_inventory_assembly" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_inv_assembly_t_w_idx" ON "document_inventory_assembly" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "doc_inv_assembly_t_fp_idx" ON "document_inventory_assembly" ("tenant_id", "finished_product");

CREATE TABLE IF NOT EXISTS "document_line_inventory_assembly_components" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "document_id" UUID         NOT NULL,
  "sequence"    INTEGER      NOT NULL,
  "product"     UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_line_inv_assembly_comp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_inv_assembly_comp_t_d_s_key"
  ON "document_line_inventory_assembly_components" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_inv_assembly_comp_t_idx"
  ON "document_line_inventory_assembly_components" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_inv_assembly_comp_t_d_idx"
  ON "document_line_inventory_assembly_components" ("tenant_id", "document_id");

CREATE TABLE IF NOT EXISTS "document_inventory_disassembly" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID         NOT NULL,
  "number"         TEXT         NOT NULL,
  "status"         TEXT         NOT NULL DEFAULT 'SAVED',
  "posted_at"      TIMESTAMP(3),
  "posted_by"      UUID,
  "version"        INTEGER      NOT NULL DEFAULT 0,
  "date"           TIMESTAMP(3) NOT NULL,
  "warehouse"      UUID         NOT NULL,
  "source_product" UUID         NOT NULL,
  "source_qty"     INTEGER      NOT NULL,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  "deleted_at"     TIMESTAMP(3),
  CONSTRAINT "document_inventory_disassembly_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_inventory_disassembly_tenant_id_number_key"
  ON "document_inventory_disassembly" ("tenant_id", "number");
CREATE INDEX IF NOT EXISTS "doc_inv_disasm_t_idx" ON "document_inventory_disassembly" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_inv_disasm_t_d_idx" ON "document_inventory_disassembly" ("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "doc_inv_disasm_t_s_idx" ON "document_inventory_disassembly" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "doc_inv_disasm_t_p_idx" ON "document_inventory_disassembly" ("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "doc_inv_disasm_t_w_idx" ON "document_inventory_disassembly" ("tenant_id", "warehouse");
CREATE INDEX IF NOT EXISTS "doc_inv_disasm_t_sp_idx" ON "document_inventory_disassembly" ("tenant_id", "source_product");

CREATE TABLE IF NOT EXISTS "document_line_inventory_disassembly_components" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "document_id" UUID         NOT NULL,
  "sequence"    INTEGER      NOT NULL,
  "product"     UUID         NOT NULL,
  "quantity"    INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doc_line_inv_disasm_comp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "doc_line_inv_disasm_comp_t_d_s_key"
  ON "document_line_inventory_disassembly_components" ("tenant_id", "document_id", "sequence");
CREATE INDEX IF NOT EXISTS "doc_line_inv_disasm_comp_t_idx"
  ON "document_line_inventory_disassembly_components" ("tenant_id");
CREATE INDEX IF NOT EXISTS "doc_line_inv_disasm_comp_t_d_idx"
  ON "document_line_inventory_disassembly_components" ("tenant_id", "document_id");

-- RLS for all 6 new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_treasury_bank_deposit',
    'document_treasury_bank_withdrawal',
    'document_inventory_assembly',
    'document_line_inventory_assembly_components',
    'document_inventory_disassembly',
    'document_line_inventory_disassembly_components'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON %I FOR ALL TO canalog_app '
      'USING ("tenant_id" = current_setting(''app.tenant_id'', true)::uuid) '
      'WITH CHECK ("tenant_id" = current_setting(''app.tenant_id'', true)::uuid)',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS "bypass_full" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "bypass_full" ON %I FOR ALL TO canalog '
      'USING (true) WITH CHECK (true)',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO canalog_app', t);
  END LOOP;
END $$;
