-- prisma/migrations/20260521120100_purchase_return/migration.sql

CREATE TABLE document_purchases_return_purchase (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  number            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'SAVED',
  posted_at         TIMESTAMP(3) NULL,
  posted_by         UUID NULL,
  version           INTEGER NOT NULL DEFAULT 0,
  date              TIMESTAMP(3) NOT NULL,
  supplier          UUID NOT NULL,
  warehouse         UUID NOT NULL,
  original_invoice  UUID NULL,
  reason            TEXT NULL,
  supplier_doc_no   TEXT NULL,
  payment_terms     TEXT NULL,
  assigned_buyer_id TEXT NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP(3) NOT NULL,
  deleted_at        TIMESTAMP(3) NULL,
  CONSTRAINT document_purchases_return_purchase_tenantId_number_key
    UNIQUE (tenant_id, number)
);

CREATE INDEX document_purchases_return_purchase_tenantId_idx
  ON document_purchases_return_purchase (tenant_id);
CREATE INDEX document_purchases_return_purchase_tenantId_deletedAt_idx
  ON document_purchases_return_purchase (tenant_id, deleted_at);
CREATE INDEX document_purchases_return_purchase_tenantId_status_idx
  ON document_purchases_return_purchase (tenant_id, status);
CREATE INDEX document_purchases_return_purchase_tenantId_postedAt_idx
  ON document_purchases_return_purchase (tenant_id, posted_at);
CREATE INDEX document_purchases_return_purchase_tenantId_createdAt_idx
  ON document_purchases_return_purchase (tenant_id, created_at);

CREATE TABLE document_line_purchases_return_purchase_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  document_id UUID NOT NULL,
  sequence    INTEGER NOT NULL,
  product     UUID NOT NULL,
  quantity    INTEGER NOT NULL,
  price       NUMERIC(14, 2) NOT NULL,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL,
  CONSTRAINT docl_purchases_return_purchase_items_tenantId_docId_seq_key
    UNIQUE (tenant_id, document_id, sequence)
);

CREATE INDEX docl_purchases_return_purchase_items_tenantId_idx
  ON document_line_purchases_return_purchase_items (tenant_id);
CREATE INDEX docl_purchases_return_purchase_items_tenantId_documentId_idx
  ON document_line_purchases_return_purchase_items (tenant_id, document_id);
