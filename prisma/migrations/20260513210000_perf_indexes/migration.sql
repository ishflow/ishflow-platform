-- Performance audit 2026-05-13: composite (tenantId, active, timestamp)
-- indexes on every movement table. Additive, non-unique, lock-light.
--
-- Hot path: dashboard KPI helpers and turnover reports filter
--   WHERE active = true [AND timestamp >= X | timestamp <= X]
-- The existing (tenantId, active) index covers the active filter only;
-- adding timestamp as the trailing key lets Postgres serve the range
-- predicate from the index instead of a heap range scan.

CREATE INDEX IF NOT EXISTS "movement_inventory_stock_balance_tenantId_active_timestamp_idx"
  ON "movement_inventory_stock_balance" ("tenant_id", "active", "timestamp");

CREATE INDEX IF NOT EXISTS "movement_purchases_accounts_payable_tenantId_active_timestamp_idx"
  ON "movement_purchases_accounts_payable" ("tenant_id", "active", "timestamp");

CREATE INDEX IF NOT EXISTS "movement_sales_accounts_receivable_tenantId_active_timestamp_idx"
  ON "movement_sales_accounts_receivable" ("tenant_id", "active", "timestamp");

CREATE INDEX IF NOT EXISTS "movement_sales_sale_tenantId_active_timestamp_idx"
  ON "movement_sales_sale" ("tenant_id", "active", "timestamp");
