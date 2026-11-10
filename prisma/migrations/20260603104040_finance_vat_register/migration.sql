-- VAT settlement register (movement_finance_vat).
--   kind='income'  → OUTPUT VAT collected on sales (liability owed to the state)
--   kind='expense' → INPUT VAT paid on purchases (reclaimable)
-- Net VAT payable for a period = Σ income − Σ expense.
--
-- HAND-WRITTEN, additive-only. `prisma migrate dev` would otherwise generate a
-- destructive full-schema reconciliation (the committed schema.prisma has
-- drifted from the migration history: index renames, relatedDocRef column
-- recreation, etc.). This migration touches ONLY the new table, so it is safe
-- to apply with `prisma migrate deploy` on any environment.

-- CreateTable
CREATE TABLE "movement_finance_vat" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "doc_ref" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "counterparty" TEXT,
    "relatedDocRef" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_finance_vat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movement_finance_vat_tenant_id_idx" ON "movement_finance_vat"("tenant_id");
CREATE INDEX "movement_finance_vat_tenant_id_active_idx" ON "movement_finance_vat"("tenant_id", "active");
CREATE INDEX "movement_finance_vat_tenant_id_doc_ref_idx" ON "movement_finance_vat"("tenant_id", "doc_ref");
CREATE INDEX "movement_finance_vat_tenant_id_active_timestamp_idx" ON "movement_finance_vat"("tenant_id", "active", "timestamp");
CREATE INDEX "movement_finance_vat_tenant_id_counterparty_relatedDocRef_t_idx" ON "movement_finance_vat"("tenant_id", "counterparty", "relatedDocRef", "timestamp");

-- Row-Level Security (codegen does not emit policies — hand-written, mirrors the
-- other movement_* tables; see feedback_rls_per_new_tenant_table).
ALTER TABLE "movement_finance_vat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movement_finance_vat" FORCE ROW LEVEL SECURITY;

CREATE POLICY movement_finance_vat_tenant_isolation
  ON "movement_finance_vat"
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY movement_finance_vat_superuser_bypass
  ON "movement_finance_vat"
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
