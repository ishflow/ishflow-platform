ALTER TABLE "catalog_sales_price_type"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'static',
  ADD COLUMN "base_price_type_id" UUID NULL;

ALTER TABLE "catalog_sales_price_type"
  ADD CONSTRAINT "catalog_sales_price_type_base_price_type_id_fkey"
    FOREIGN KEY ("base_price_type_id")
    REFERENCES "catalog_sales_price_type"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX "catalog_sales_price_type_base_price_type_id_idx"
  ON "catalog_sales_price_type"("base_price_type_id");
