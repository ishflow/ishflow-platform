-- Demo seed for stock-balance register matrix view.
-- Spreads 6 products across 3 warehouses with normal / low / zero stock
-- so the pill-warning + pill-danger visual signals show up out of the box.
--
-- Usage:
--   docker compose exec -T postgres psql -U canalog -d canalog_dev \
--     -f /work/scripts/seed-stock-balance-demo.sql
-- Or pipe via stdin (no mount):
--   docker compose exec -T postgres psql -U canalog -d canalog_dev \
--     < scripts/seed-stock-balance-demo.sql

BEGIN;
SET LOCAL app.bypass_rls = 'on';

-- Tenant + product + warehouse IDs (Dev Bypass tenant).
-- tenant      = 00000000-0000-0000-0000-000000d3b001
-- depo-1      = 5c2da422-e0ab-48b0-9774-262261071b54  (code 21E63B5B, label "Depo 1")
-- wh-c5c0     = 11111111-1111-1111-1111-100000000002  (code CODE-042f)
-- wh-4a4e     = 11111111-1111-1111-1111-100000000003  (code CODE-2398)
--
-- coca cola   = d6790e8b-5b17-48c0-a64e-21b8d5705400  (cost 0.30, no min)
-- fanta       = 74ddf9fe-36fe-4df5-8478-7f9628ce84e1  (cost 0.35, no min)
-- pepsi       = 2f3c252c-4745-4c73-8a85-04db699889c8  (cost 0.28, min 50)
-- sprite      = eb4ee93d-d4b0-416e-8e41-ebd06546e5bd  (cost 0.27, min 50)
-- fuse tea    = e831c1e4-6e20-4cf1-8940-a349e95fbe75  (cost 0.42, min 30)
-- red bull    = b5571bdb-ac41-492b-8def-91a7c541a782  (cost 1.20, min 20)

-- Wipe prior demo entries (idempotent reseed).
DELETE FROM movement_inventory_stock_balance
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001'
  AND doc_type = 'demo_seed_stock_balance';

INSERT INTO movement_inventory_stock_balance
  (id, tenant_id, doc_ref, doc_type, kind, active, timestamp, product, quantity, warehouse, "totalCost")
VALUES
  -- ── Coca Cola — no min ─────────────────────────────────────────
  -- Depo 1: 100 normal (already had 50 net from prior seed, total ≈ 150)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'd6790e8b-5b17-48c0-a64e-21b8d5705400', 100, '5c2da422-e0ab-48b0-9774-262261071b54',  30.00),
  -- WH-c5c0: 80 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'd6790e8b-5b17-48c0-a64e-21b8d5705400',  80, '11111111-1111-1111-1111-100000000002',  24.00),
  -- WH-4a4e: 0 (no movement)

  -- ── Fanta — no min ─────────────────────────────────────────────
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', '74ddf9fe-36fe-4df5-8478-7f9628ce84e1',  60, '5c2da422-e0ab-48b0-9774-262261071b54',  21.00),
  -- WH-c5c0: 0 (no movement → won't render in matrix unless product is anywhere active, which it is)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', '74ddf9fe-36fe-4df5-8478-7f9628ce84e1',  30, '11111111-1111-1111-1111-100000000003',  10.50),

  -- ── Pepsi — min 50 ─────────────────────────────────────────────
  -- Depo 1: 100 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', '2f3c252c-4745-4c73-8a85-04db699889c8', 100, '5c2da422-e0ab-48b0-9774-262261071b54',  28.00),
  -- WH-c5c0: 30 (LOW — below min 50)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', '2f3c252c-4745-4c73-8a85-04db699889c8',  30, '11111111-1111-1111-1111-100000000002',   8.40),
  -- WH-4a4e: 60 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', '2f3c252c-4745-4c73-8a85-04db699889c8',  60, '11111111-1111-1111-1111-100000000003',  16.80),

  -- ── Sprite — min 50 ────────────────────────────────────────────
  -- Depo 1: 60 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd',  60, '5c2da422-e0ab-48b0-9774-262261071b54',  16.20),
  -- WH-c5c0: 50 in, 50 out → 0 (ZERO)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd',  50, '11111111-1111-1111-1111-100000000002',  13.50),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'expense', true, '2026-05-18 14:00:00', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd',  50, '11111111-1111-1111-1111-100000000002',  13.50),
  -- WH-4a4e: 40 (LOW — below min 50)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd',  40, '11111111-1111-1111-1111-100000000003',  10.80),

  -- ── Fuse Tea — min 30 ──────────────────────────────────────────
  -- Depo 1: 50 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'e831c1e4-6e20-4cf1-8940-a349e95fbe75',  50, '5c2da422-e0ab-48b0-9774-262261071b54',  21.00),
  -- WH-c5c0: 25 (LOW — below min 30)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'e831c1e4-6e20-4cf1-8940-a349e95fbe75',  25, '11111111-1111-1111-1111-100000000002',  10.50),
  -- WH-4a4e: 35 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'e831c1e4-6e20-4cf1-8940-a349e95fbe75',  35, '11111111-1111-1111-1111-100000000003',  14.70),

  -- ── Red Bull — min 20 ──────────────────────────────────────────
  -- Depo 1: 30 normal
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'b5571bdb-ac41-492b-8def-91a7c541a782',  30, '5c2da422-e0ab-48b0-9774-262261071b54',  36.00),
  -- WH-c5c0: 10 (LOW — below min 20)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'b5571bdb-ac41-492b-8def-91a7c541a782',  10, '11111111-1111-1111-1111-100000000002',  12.00),
  -- WH-4a4e: 20 in, 20 out → 0 (ZERO)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'income',  true, '2026-05-15 10:00:00', 'b5571bdb-ac41-492b-8def-91a7c541a782',  20, '11111111-1111-1111-1111-100000000003',  24.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_stock_balance', 'expense', true, '2026-05-19 14:00:00', 'b5571bdb-ac41-492b-8def-91a7c541a782',  20, '11111111-1111-1111-1111-100000000003',  24.00);

COMMIT;

-- Verify
SELECT
  p.name AS product,
  w.code AS warehouse,
  SUM(CASE m.kind WHEN 'income' THEN m.quantity WHEN 'expense' THEN -m.quantity ELSE 0 END) AS balance,
  p.min_stock
FROM movement_inventory_stock_balance m
JOIN catalog_inventory_product p ON p.id = m.product
JOIN catalog_inventory_warehouse w ON w.id = m.warehouse
WHERE m.tenant_id = '00000000-0000-0000-0000-000000d3b001'
  AND m.active = true
GROUP BY p.name, w.code, p.min_stock
ORDER BY p.name, w.code;
