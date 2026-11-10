-- Two new catalog tables for product taxonomies
CREATE TABLE "catalog_inventory_product_category" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3)
);

CREATE UNIQUE INDEX "catalog_inventory_product_category_tenant_id_name_key"
  ON "catalog_inventory_product_category" ("tenant_id", "name");
CREATE INDEX "catalog_inventory_product_category_tenant_id_idx"
  ON "catalog_inventory_product_category" ("tenant_id");
CREATE INDEX "catalog_inventory_product_category_tenant_id_deleted_at_idx"
  ON "catalog_inventory_product_category" ("tenant_id", "deleted_at");
CREATE INDEX "catalog_inventory_product_category_tenant_id_created_at_idx"
  ON "catalog_inventory_product_category" ("tenant_id", "created_at");
CREATE INDEX "catalog_inventory_product_category_tenant_id_name_idx"
  ON "catalog_inventory_product_category" ("tenant_id", "name");

CREATE TABLE "catalog_inventory_product_group" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3)
);

CREATE UNIQUE INDEX "catalog_inventory_product_group_tenant_id_name_key"
  ON "catalog_inventory_product_group" ("tenant_id", "name");
CREATE INDEX "catalog_inventory_product_group_tenant_id_idx"
  ON "catalog_inventory_product_group" ("tenant_id");
CREATE INDEX "catalog_inventory_product_group_tenant_id_deleted_at_idx"
  ON "catalog_inventory_product_group" ("tenant_id", "deleted_at");
CREATE INDEX "catalog_inventory_product_group_tenant_id_created_at_idx"
  ON "catalog_inventory_product_group" ("tenant_id", "created_at");
CREATE INDEX "catalog_inventory_product_group_tenant_id_name_idx"
  ON "catalog_inventory_product_group" ("tenant_id", "name");

-- Two optional FK columns on existing product table
ALTER TABLE "catalog_inventory_product"
  ADD COLUMN "category_id" UUID,
  ADD COLUMN "group_id"    UUID;

CREATE INDEX "catalog_inventory_product_tenant_id_category_id_idx"
  ON "catalog_inventory_product" ("tenant_id", "category_id");
CREATE INDEX "catalog_inventory_product_tenant_id_group_id_idx"
  ON "catalog_inventory_product" ("tenant_id", "group_id");
