-- inventory.inventory_count — physical count snapshot doc + lines + RLS.

CREATE TABLE "document_inventory_inventory_count" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SAVED',
  "posted_at" TIMESTAMP(3),
  "posted_by" UUID,
  "version" INT NOT NULL DEFAULT 0,
  "date" TIMESTAMP(3) NOT NULL,
  "warehouse" UUID NOT NULL,
  "count_status" TEXT NOT NULL DEFAULT 'counting',
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "document_inventory_inventory_count_tenantId_number_key" UNIQUE ("tenant_id", "number")
);

CREATE INDEX "document_inventory_inventory_count_tenantId_idx"
  ON "document_inventory_inventory_count"("tenant_id");
CREATE INDEX "document_inventory_inventory_count_tenantId_deletedAt_idx"
  ON "document_inventory_inventory_count"("tenant_id", "deleted_at");
CREATE INDEX "document_inventory_inventory_count_tenantId_status_idx"
  ON "document_inventory_inventory_count"("tenant_id", "status");
CREATE INDEX "document_inventory_inventory_count_tenantId_postedAt_idx"
  ON "document_inventory_inventory_count"("tenant_id", "posted_at");
CREATE INDEX "document_inventory_inventory_count_tenantId_createdAt_idx"
  ON "document_inventory_inventory_count"("tenant_id", "created_at");

CREATE TABLE "document_line_inventory_inventory_count_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "sequence" INT NOT NULL,
  "product" UUID NOT NULL,
  "expected_quantity" INT,
  "counted_quantity" INT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "docl_inv_count_items_tenantId_docId_seq_key" UNIQUE ("tenant_id", "document_id", "sequence")
);

CREATE INDEX "docl_inv_count_items_tenantId_idx"
  ON "document_line_inventory_inventory_count_items"("tenant_id");
CREATE INDEX "docl_inv_count_items_tenantId_documentId_idx"
  ON "document_line_inventory_inventory_count_items"("tenant_id", "document_id");

ALTER TABLE "document_inventory_inventory_count" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_inventory_inventory_count" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "document_inventory_inventory_count"
  USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "document_line_inventory_inventory_count_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_line_inventory_inventory_count_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "document_line_inventory_inventory_count_items"
  USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
