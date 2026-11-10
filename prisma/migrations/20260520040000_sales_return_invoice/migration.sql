-- sales.return_invoice — sales return document + lines + paired RLS policies.

CREATE TABLE "document_sales_return_invoice" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SAVED',
  "posted_at" TIMESTAMP(3),
  "posted_by" UUID,
  "version" INT NOT NULL DEFAULT 0,
  "date" TIMESTAMP(3) NOT NULL,
  "customer" UUID NOT NULL,
  "warehouse" UUID NOT NULL,
  "original_invoice" UUID,
  "reason" TEXT,
  "assigned_rep_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "document_sales_return_invoice_tenantId_number_key" UNIQUE ("tenant_id", "number")
);

CREATE INDEX "document_sales_return_invoice_tenantId_idx"
  ON "document_sales_return_invoice"("tenant_id");
CREATE INDEX "document_sales_return_invoice_tenantId_deletedAt_idx"
  ON "document_sales_return_invoice"("tenant_id", "deleted_at");
CREATE INDEX "document_sales_return_invoice_tenantId_status_idx"
  ON "document_sales_return_invoice"("tenant_id", "status");
CREATE INDEX "document_sales_return_invoice_tenantId_postedAt_idx"
  ON "document_sales_return_invoice"("tenant_id", "posted_at");
CREATE INDEX "document_sales_return_invoice_tenantId_createdAt_idx"
  ON "document_sales_return_invoice"("tenant_id", "created_at");

CREATE TABLE "document_line_sales_return_invoice_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "sequence" INT NOT NULL,
  "product" UUID NOT NULL,
  "quantity" INT NOT NULL,
  "price" DECIMAL(14,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "docl_sales_return_invoice_items_tenantId_docId_seq_key" UNIQUE ("tenant_id", "document_id", "sequence")
);

CREATE INDEX "docl_sales_return_invoice_items_tenantId_idx"
  ON "document_line_sales_return_invoice_items"("tenant_id");
CREATE INDEX "docl_sales_return_invoice_items_tenantId_documentId_idx"
  ON "document_line_sales_return_invoice_items"("tenant_id", "document_id");

-- Paired RLS policies (memory: feedback_rls_per_new_tenant_table)

ALTER TABLE "document_sales_return_invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_sales_return_invoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "document_sales_return_invoice"
  USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "document_line_sales_return_invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_line_sales_return_invoice_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "document_line_sales_return_invoice_items"
  USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
