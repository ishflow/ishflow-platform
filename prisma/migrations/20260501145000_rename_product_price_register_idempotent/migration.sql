-- Bring local Postgres in line with prod for the product_price information
-- register. Prod was created via 20260425_pricing_register as
-- register_inventory_product_price. Local was diverged at some point (likely
-- a `prisma db push` against a schema that had renamed the model to
-- Movement_*) and ended up with movement_inventory_product_price + a
-- partially different column shape. The Prisma model is now
-- Register_inventory_product_price → register_inventory_product_price; this
-- migration normalises any environment whose state still says otherwise.
--
-- All branches are guarded so the migration is a no-op on the prod schema.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'movement_inventory_product_price'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'register_inventory_product_price'
  )
  THEN
    -- Rename the table.
    ALTER TABLE "movement_inventory_product_price"
      RENAME TO "register_inventory_product_price";

    -- The Movement_* shape carried docType / kind / active / timestamp
    -- columns that do not exist on the Register_* shape. Drop them if they
    -- linger so reads against the new model don't return surprise columns.
    ALTER TABLE "register_inventory_product_price" DROP COLUMN IF EXISTS "doc_type";
    ALTER TABLE "register_inventory_product_price" DROP COLUMN IF EXISTS "kind";
    ALTER TABLE "register_inventory_product_price" DROP COLUMN IF EXISTS "active";
    ALTER TABLE "register_inventory_product_price" DROP COLUMN IF EXISTS "timestamp";
    ALTER TABLE "register_inventory_product_price" DROP COLUMN IF EXISTS "updated_at";

    -- Add the columns the Register_* model expects if they are missing.
    ALTER TABLE "register_inventory_product_price"
      ADD COLUMN IF NOT EXISTS "period" DATE;
    ALTER TABLE "register_inventory_product_price"
      ADD COLUMN IF NOT EXISTS "recorder_type" TEXT;
    ALTER TABLE "register_inventory_product_price"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

    -- Recreate the period-sorted lookup index Prisma expects.
    DROP INDEX IF EXISTS "movement_inventory_product_price_tenantId_product_priceType_timestamp_idx";
    DROP INDEX IF EXISTS "movement_inventory_product_price_tenantId_idx";
    DROP INDEX IF EXISTS "movement_inventory_product_price_tenantId_active_idx";
    DROP INDEX IF EXISTS "movement_inventory_product_price_tenantId_docRef_idx";

    CREATE INDEX IF NOT EXISTS "register_inventory_product_price_lookup_idx"
      ON "register_inventory_product_price" (tenant_id, product, "priceType", period DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS "register_inventory_product_price_docref_idx"
      ON "register_inventory_product_price" (tenant_id, doc_ref);
  END IF;
END $$;
