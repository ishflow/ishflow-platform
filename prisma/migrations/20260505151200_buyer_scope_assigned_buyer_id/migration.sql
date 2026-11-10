-- AlterTable
ALTER TABLE "catalog_purchases_supplier" ADD COLUMN "assigned_buyer_id" UUID;

-- AlterTable
ALTER TABLE "document_purchases_invoice" ADD COLUMN "assigned_buyer_id" UUID;

-- AlterTable
ALTER TABLE "document_purchases_payment_sent" ADD COLUMN "assigned_buyer_id" UUID;

-- CreateIndex
CREATE INDEX "catalog_purchases_supplier_tenant_id_assigned_buyer_id_idx" ON "catalog_purchases_supplier"("tenant_id", "assigned_buyer_id");

-- CreateIndex
CREATE INDEX "document_purchases_invoice_tenant_id_assigned_buyer_id_idx" ON "document_purchases_invoice"("tenant_id", "assigned_buyer_id");

-- CreateIndex
CREATE INDEX "document_purchases_payment_sent_tenant_id_assigned_buyer_id_idx" ON "document_purchases_payment_sent"("tenant_id", "assigned_buyer_id");
