-- Sprint 33 T2: add nullable priceType reference to sales invoice header.
ALTER TABLE document_sales_invoice ADD COLUMN "priceType" UUID;

CREATE INDEX IF NOT EXISTS "document_sales_invoice_tenant_id_priceType_idx"
  ON document_sales_invoice ("tenant_id", "priceType");
