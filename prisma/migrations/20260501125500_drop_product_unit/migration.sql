-- Drop the unit column from catalog_inventory_product. The product config no
-- longer declares a unit field; the column is no longer read or written by
-- any runtime code. Safe to drop unconditionally — dropped columns can be
-- re-added later via a new migration if/when the field is reintroduced.

ALTER TABLE "catalog_inventory_product" DROP COLUMN "unit";
