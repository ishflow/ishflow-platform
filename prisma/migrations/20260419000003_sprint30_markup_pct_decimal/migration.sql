-- Sprint 30: widen markupPct to Decimal(5,4) for fractional markups, and default priority.
ALTER TABLE catalog_sales_price_agreement
  ALTER COLUMN "markupPct" TYPE NUMERIC(5, 4) USING "markupPct"::numeric;

ALTER TABLE catalog_sales_price_agreement
  ALTER COLUMN priority SET DEFAULT 0;
