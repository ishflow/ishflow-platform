-- Replace global @unique with tenant-scoped composite @@unique.
-- Two fresh tenants can now share the same user-facing unique value
-- (e.g. product SKU-0001 or customer "Acme Co.") without colliding at
-- the database level.  Strictly more permissive than the prior
-- constraints — no existing row is invalidated by this migration.

-- catalog_inventory_product.code
DROP INDEX "catalog_inventory_product_code_key";
CREATE UNIQUE INDEX "catalog_inventory_product_tenant_id_code_key"
  ON "catalog_inventory_product"("tenant_id", "code");

-- catalog_sales_customer.name
DROP INDEX "catalog_sales_customer_name_key";
CREATE UNIQUE INDEX "catalog_sales_customer_tenant_id_name_key"
  ON "catalog_sales_customer"("tenant_id", "name");
