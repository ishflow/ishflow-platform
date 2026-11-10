-- Cash register gains a currency column (nullable, backfilled to tenant.currency).
-- Bank account currency column tightened: drop legacy default, ensure VARCHAR(3).

ALTER TABLE "catalog_treasury_cash_register"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3);

-- Backfill any existing cash register rows to their tenant's functional currency.
UPDATE "catalog_treasury_cash_register" cr
SET "currency" = LEFT(t."currency", 3)
FROM "tenant" t
WHERE cr."tenant_id" = t."id" AND cr."currency" IS NULL;

-- BankAccount: drop the default + ensure VARCHAR(3) typing.
ALTER TABLE "bank_account"
  ALTER COLUMN "currency" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_account' AND column_name = 'currency'
      AND (data_type <> 'character varying' OR character_maximum_length <> 3)
  ) THEN
    EXECUTE 'ALTER TABLE "bank_account" ALTER COLUMN "currency" TYPE VARCHAR(3) USING substring("currency", 1, 3)';
  END IF;
END $$;
