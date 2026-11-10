-- treasury.cash_funds register: add multi-currency forensic columns
-- mirroring sales.accounts_receivable / purchases.accounts_payable pattern.
--
-- amount          stays in tenant base currency (so legacy balance() helpers
--                 keep returning a base-comparable scalar).
-- amount_original holds the user-entered amount in the doc's currency.
-- currency_original is the ISO-4217 code of the doc currency at post time.
-- fx_rate         is the doc→base conversion rate captured at post time.
--
-- All three are NULLABLE so historical rows keep working. New posting
-- code always fills them; balance helpers can fall back to `amount` when
-- amount_original IS NULL.

ALTER TABLE "movement_treasury_cash_funds"
  ADD COLUMN "amount_original"   NUMERIC(14, 2),
  ADD COLUMN "currency_original" VARCHAR(3),
  ADD COLUMN "fx_rate"           NUMERIC(18, 8);

CREATE INDEX IF NOT EXISTS "movement_treasury_cash_funds_tenant_kasa_ccy_idx"
  ON "movement_treasury_cash_funds" ("tenant_id", "cash_register", "currency_original");
