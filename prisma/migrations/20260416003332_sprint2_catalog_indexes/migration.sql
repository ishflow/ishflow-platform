-- CreateIndex
CREATE INDEX "catalog_sales_customer_tenant_id_deleted_at_idx" ON "catalog_sales_customer"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "catalog_sales_customer_tenant_id_created_at_idx" ON "catalog_sales_customer"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "catalog_sales_customer_tenant_id_name_idx" ON "catalog_sales_customer"("tenant_id", "name");
