-- Sprint 5: document lines (tabular child tables).
-- Breaking change: removes product/quantity/price from document_sales_invoice
-- header (they move to the new line table). Existing dev rows lose those
-- columns; seed re-creates invoices with multi-line data.

-- DropColumns from document_sales_invoice
ALTER TABLE "document_sales_invoice" DROP COLUMN "product";
ALTER TABLE "document_sales_invoice" DROP COLUMN "quantity";
ALTER TABLE "document_sales_invoice" DROP COLUMN "price";

-- CreateTable
CREATE TABLE "document_line_sales_invoice_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "product" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_line_sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_line_sales_invoice_items_tenant_id_idx" ON "document_line_sales_invoice_items"("tenant_id");

-- CreateIndex
CREATE INDEX "document_line_sales_invoice_items_tenant_id_document_id_idx" ON "document_line_sales_invoice_items"("tenant_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_line_sales_invoice_items_tenant_id_document_id_seq_key" ON "document_line_sales_invoice_items"("tenant_id", "document_id", "sequence");

-- RLS: tenant isolation + superuser bypass (mirrors rls_sprint3 pattern)
ALTER TABLE document_line_sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_line_sales_invoice_items FORCE ROW LEVEL SECURITY;

CREATE POLICY document_line_sales_invoice_items_tenant_isolation ON document_line_sales_invoice_items
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

CREATE POLICY document_line_sales_invoice_items_superuser_bypass ON document_line_sales_invoice_items
  USING (current_setting('app.bypass_rls', TRUE) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
