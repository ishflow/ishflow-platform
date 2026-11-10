-- Sprint 33 T7: pricing page becomes a live matrix; the stored unitCost
-- snapshot is no longer consumed by the resolver.
ALTER TABLE catalog_inventory_product_price DROP COLUMN IF EXISTS "unitCost";
