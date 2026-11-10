-- Opening balance on cash_register catalog. Additive; existing rows default to 0.

ALTER TABLE catalog_treasury_cash_register
  ADD COLUMN opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0;
