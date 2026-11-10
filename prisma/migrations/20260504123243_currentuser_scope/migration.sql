/*
  Warnings:

  - You are about to drop the column `price_type` on the `document_sales_invoice` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ScopeOperator" ADD VALUE 'currentUser';

-- DropForeignKey
ALTER TABLE "catalog_sales_customer" DROP CONSTRAINT "catalog_sales_customer_default_price_type_fkey";

-- DropForeignKey
ALTER TABLE "catalog_sales_price_type" DROP CONSTRAINT "catalog_sales_price_type_base_price_type_id_fkey";

-- DropForeignKey
ALTER TABLE "device_push_token" DROP CONSTRAINT "device_push_token_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "device_push_token" DROP CONSTRAINT "device_push_token_user_id_fkey";

-- DropForeignKey
ALTER TABLE "document_sales_invoice" DROP CONSTRAINT "document_sales_invoice_price_type_fkey";

-- DropForeignKey
ALTER TABLE "fx_rate" DROP CONSTRAINT "fx_rate_tenant_fkey";

-- DropForeignKey
ALTER TABLE "idempotency_key" DROP CONSTRAINT "idempotency_key_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "period_close" DROP CONSTRAINT "period_close_tenant_fkey";

-- DropForeignKey
ALTER TABLE "period_close" DROP CONSTRAINT "period_close_user_fkey";

-- DropIndex
DROP INDEX "catalog_sales_price_agreement_customer_product_idx";

-- DropIndex
DROP INDEX "catalog_sales_price_agreement_unique_cust_prod_from";

-- DropIndex
DROP INDEX "catalog_sales_price_type_base_price_type_id_idx";

-- DropIndex
DROP INDEX "document_sales_invoice_tenant_id_priceType_idx";

-- DropIndex
DROP INDEX "movement_inventory_stock_balance_tenant_id_product_timestam_idx";

-- AlterTable
ALTER TABLE "catalog_inventory_product_category" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog_inventory_product_group" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog_inventory_warehouse" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "code" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "catalog_sales_price_type" ALTER COLUMN "kind" DROP DEFAULT;

-- AlterTable
ALTER TABLE "device_push_token" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_inventory_price_setting" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "posted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "document_line_inventory_price_setting_items" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "document_sales_invoice" DROP COLUMN "price_type";

-- AlterTable
ALTER TABLE "fx_rate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "movement_inventory_stock_balance" ALTER COLUMN "totalCost" DROP DEFAULT;

-- AlterTable
ALTER TABLE "movement_purchases_accounts_payable" ALTER COLUMN "relatedDocRef" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "movement_sales_accounts_receivable" ALTER COLUMN "relatedDocRef" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "period_close" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "register_inventory_product_price" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "catalog_sales_price_type_tenant_id_name_idx" ON "catalog_sales_price_type"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "document_line_inventory_price_setting_items_tenant_id_docum_idx" ON "document_line_inventory_price_setting_items"("tenant_id", "document_id");

-- CreateIndex
CREATE INDEX "register_inventory_product_price_tenant_id_product_priceTyp_idx" ON "register_inventory_product_price"("tenant_id", "product", "priceType", "period" DESC);

-- AddForeignKey
ALTER TABLE "fx_rate" ADD CONSTRAINT "fx_rate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_close" ADD CONSTRAINT "period_close_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_close" ADD CONSTRAINT "period_close_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_push_token" ADD CONSTRAINT "device_push_token_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_push_token" ADD CONSTRAINT "device_push_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "document_line_inventory_price_setting_items_tenant_id_document_" RENAME TO "document_line_inventory_price_setting_items_tenant_id_docum_key";

-- RenameIndex
ALTER INDEX "fx_rate_tenant_base_quote_date_idx" RENAME TO "fx_rate_tenant_id_base_quote_date_idx";

-- RenameIndex
ALTER INDEX "fx_rate_tenant_base_quote_date_uq" RENAME TO "fx_rate_tenant_id_base_quote_date_key";

-- RenameIndex
ALTER INDEX "movement_inventory_stock_balance_tenant_wh_prod_ts_idx" RENAME TO "movement_inventory_stock_balance_tenant_id_warehouse_produc_idx";

-- RenameIndex
ALTER INDEX "movement_purchases_accounts_payable_tenant_id_supplier_relatedd" RENAME TO "movement_purchases_accounts_payable_tenant_id_supplier_rela_idx";

-- RenameIndex
ALTER INDEX "movement_sales_accounts_receivable_tenant_id_customer_relateddo" RENAME TO "movement_sales_accounts_receivable_tenant_id_customer_relat_idx";

-- RenameIndex
ALTER INDEX "movement_sales_sale_tenant_id_counterparty_product_timestamp_id" RENAME TO "movement_sales_sale_tenant_id_counterparty_product_timestam_idx";

-- RenameIndex
ALTER INDEX "register_inventory_product_price_docref_idx" RENAME TO "register_inventory_product_price_tenant_id_doc_ref_idx";
