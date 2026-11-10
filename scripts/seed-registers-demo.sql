-- Comprehensive demo seed for V2 register layer.
-- Populates accounts_receivable, accounts_payable, sales_sale movement tables
-- across multiple customers / suppliers so every register page shows lived-in
-- data out of the box.
--
-- Idempotent: wipes prior 'demo_seed_registers' entries before reinserting.
--
-- Usage:
--   cat scripts/seed-registers-demo.sql | docker compose exec -T postgres psql -U canalog -d canalog_dev

BEGIN;
SET LOCAL app.bypass_rls = 'on';

-- ============================================================
-- Customers — add 3 more (existing: Test Customer, Ulugbek)
-- ============================================================
INSERT INTO catalog_sales_customer (id, tenant_id, code, name, created_at, updated_at)
VALUES
  ('22222222-2222-2222-2222-100000000001', '00000000-0000-0000-0000-000000d3b001', 'CUST-001', 'OOO Megapolis',  NOW(), NOW()),
  ('22222222-2222-2222-2222-100000000002', '00000000-0000-0000-0000-000000d3b001', 'CUST-002', 'IP Karimov',     NOW(), NOW()),
  ('22222222-2222-2222-2222-100000000003', '00000000-0000-0000-0000-000000d3b001', 'CUST-003', 'OOO Tashkent Trade', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Suppliers — add 3 more (existing: Coca Cola Tedarikci, Fanta)
-- ============================================================
INSERT INTO catalog_purchases_supplier (id, tenant_id, code, name, created_at, updated_at)
VALUES
  ('33333333-3333-3333-3333-100000000001', '00000000-0000-0000-0000-000000d3b001', 'SUP-001', 'Pepsi Distribyutor', NOW(), NOW()),
  ('33333333-3333-3333-3333-100000000002', '00000000-0000-0000-0000-000000d3b001', 'SUP-002', 'Red Bull Eurasia',   NOW(), NOW()),
  ('33333333-3333-3333-3333-100000000003', '00000000-0000-0000-0000-000000d3b001', 'SUP-003', 'OOO Logistika',      NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Wipe prior demo movements
-- ============================================================
DELETE FROM movement_sales_accounts_receivable
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001'
  AND doc_type = 'demo_seed_registers';
DELETE FROM movement_purchases_accounts_payable
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001'
  AND doc_type = 'demo_seed_registers';
DELETE FROM movement_sales_sale
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001'
  AND doc_type = 'demo_seed_registers';

-- ============================================================
-- ACCOUNTS RECEIVABLE — 18 movements (charges + payments)
-- Customer ledger: charge (sales invoice) → optional payment (partial / full)
-- Mix of open / paid / overdue
-- ============================================================
INSERT INTO movement_sales_accounts_receivable
  (id, tenant_id, doc_ref, doc_type, kind, active, timestamp, customer, amount)
VALUES
  -- Test Customer (276CB56D) — 4 invoices, mix of open + paid + overdue
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-03-12 10:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb',  4200.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-03-25 14:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb',  4200.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-18 10:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb',  2850.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-08 11:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb',  1640.00),

  -- Ulugbek (B76CB905) — 3 invoices
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-02 09:00:00', '44b77173-4484-4122-9f93-85e27e4d63f3',  6800.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-04-15 12:00:00', '44b77173-4484-4122-9f93-85e27e4d63f3',  4000.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-12 10:00:00', '44b77173-4484-4122-9f93-85e27e4d63f3',  3200.00),

  -- Megapolis (CUST-001) — bigger client
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-03-22 09:00:00', '22222222-2222-2222-2222-100000000001', 12400.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-04-05 13:00:00', '22222222-2222-2222-2222-100000000001', 12400.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-22 09:00:00', '22222222-2222-2222-2222-100000000001',  9800.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-05-05 11:00:00', '22222222-2222-2222-2222-100000000001',  5000.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-15 10:00:00', '22222222-2222-2222-2222-100000000001',  7600.00),

  -- IP Karimov (CUST-002) — small but consistent
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-09 10:00:00', '22222222-2222-2222-2222-100000000002',  1850.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-04-20 14:00:00', '22222222-2222-2222-2222-100000000002',  1850.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-10 10:00:00', '22222222-2222-2222-2222-100000000002',  2200.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-05-18 09:00:00', '22222222-2222-2222-2222-100000000002',  2200.00),

  -- Tashkent Trade (CUST-003) — recent, overdue
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-03-30 10:00:00', '22222222-2222-2222-2222-100000000003',  5400.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-14 09:00:00', '22222222-2222-2222-2222-100000000003',  3700.00);

-- ============================================================
-- ACCOUNTS PAYABLE — 14 movements
-- Supplier ledger: charge (purchase invoice) → optional payment
-- ============================================================
INSERT INTO movement_purchases_accounts_payable
  (id, tenant_id, doc_ref, doc_type, kind, active, timestamp, supplier, amount)
VALUES
  -- Coca Cola Tedarikci (B43EB05F)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-03-15 10:00:00', '426f1fe4-65ea-4bfc-8747-6e7062155244',  8500.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-03-28 13:00:00', '426f1fe4-65ea-4bfc-8747-6e7062155244',  8500.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-20 10:00:00', '426f1fe4-65ea-4bfc-8747-6e7062155244',  6200.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-05-02 12:00:00', '426f1fe4-65ea-4bfc-8747-6e7062155244',  3000.00),

  -- Fanta supplier (CCC6B396)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-08 10:00:00', '0fca2202-3f13-43b8-935c-f6bc858da867',  4400.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-04-22 14:00:00', '0fca2202-3f13-43b8-935c-f6bc858da867',  4400.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-09 10:00:00', '0fca2202-3f13-43b8-935c-f6bc858da867',  3100.00),

  -- Pepsi Distribyutor (SUP-001)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-12 10:00:00', '33333333-3333-3333-3333-100000000001',  7800.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-04-30 14:00:00', '33333333-3333-3333-3333-100000000001',  7800.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-12 10:00:00', '33333333-3333-3333-3333-100000000001',  5600.00),

  -- Red Bull Eurasia (SUP-002)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-05-01 10:00:00', '33333333-3333-3333-3333-100000000002',  4200.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-05-12 14:00:00', '33333333-3333-3333-3333-100000000002',  2000.00),

  -- OOO Logistika (SUP-003) — operational, recurring
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'charge',  true, '2026-04-15 10:00:00', '33333333-3333-3333-3333-100000000003',  1800.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'payment', true, '2026-04-28 14:00:00', '33333333-3333-3333-3333-100000000003',  1800.00);

-- ============================================================
-- SALES — 24 line-level movements
-- One row = one sale invoice line (counterparty × product × qty × cost × revenue)
-- ============================================================
INSERT INTO movement_sales_sale
  (id, tenant_id, doc_ref, doc_type, kind, active, timestamp, counterparty, product, quantity, cost, revenue)
VALUES
  -- Test Customer — Coca Cola + Pepsi
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-12 10:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb', 'd6790e8b-5b17-48c0-a64e-21b8d5705400',  80,  24.00,  72.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-18 10:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb', '2f3c252c-4745-4c73-8a85-04db699889c8',  60,  16.80,  54.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-08 11:00:00', '17094b4b-bea3-461b-beb6-78402926c4bb', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd', 100,  27.00,  90.00),

  -- Ulugbek
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-02 09:00:00', '44b77173-4484-4122-9f93-85e27e4d63f3', 'd6790e8b-5b17-48c0-a64e-21b8d5705400', 120,  36.00, 108.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-02 09:00:00', '44b77173-4484-4122-9f93-85e27e4d63f3', '74ddf9fe-36fe-4df5-8478-7f9628ce84e1',  80,  28.00,  64.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-12 10:00:00', '44b77173-4484-4122-9f93-85e27e4d63f3', 'b5571bdb-ac41-492b-8def-91a7c541a782',  30,  36.00, 120.00),

  -- Megapolis — big orders, multi-line
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-22 09:00:00', '22222222-2222-2222-2222-100000000001', 'd6790e8b-5b17-48c0-a64e-21b8d5705400', 200,  60.00, 180.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-22 09:00:00', '22222222-2222-2222-2222-100000000001', '74ddf9fe-36fe-4df5-8478-7f9628ce84e1', 180,  63.00, 144.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-22 09:00:00', '22222222-2222-2222-2222-100000000001', '2f3c252c-4745-4c73-8a85-04db699889c8', 150,  42.00, 135.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-22 09:00:00', '22222222-2222-2222-2222-100000000001', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd', 250,  67.50, 225.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-22 09:00:00', '22222222-2222-2222-2222-100000000001', 'e831c1e4-6e20-4cf1-8940-a349e95fbe75', 140,  58.80, 154.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-15 10:00:00', '22222222-2222-2222-2222-100000000001', 'b5571bdb-ac41-492b-8def-91a7c541a782',  80,  96.00, 320.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-15 10:00:00', '22222222-2222-2222-2222-100000000001', '74ddf9fe-36fe-4df5-8478-7f9628ce84e1', 100,  35.00,  80.00),

  -- IP Karimov
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-09 10:00:00', '22222222-2222-2222-2222-100000000002', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd',  60,  16.20,  54.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-04-09 10:00:00', '22222222-2222-2222-2222-100000000002', '2f3c252c-4745-4c73-8a85-04db699889c8',  40,  11.20,  36.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-10 10:00:00', '22222222-2222-2222-2222-100000000002', 'd6790e8b-5b17-48c0-a64e-21b8d5705400',  90,  27.00,  81.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-10 10:00:00', '22222222-2222-2222-2222-100000000002', 'e831c1e4-6e20-4cf1-8940-a349e95fbe75',  60,  25.20,  66.00),

  -- Tashkent Trade
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-30 10:00:00', '22222222-2222-2222-2222-100000000003', 'd6790e8b-5b17-48c0-a64e-21b8d5705400', 110,  33.00,  99.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-30 10:00:00', '22222222-2222-2222-2222-100000000003', '74ddf9fe-36fe-4df5-8478-7f9628ce84e1',  90,  31.50,  72.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-03-30 10:00:00', '22222222-2222-2222-2222-100000000003', 'eb4ee93d-d4b0-416e-8e41-ebd06546e5bd', 130,  35.10, 117.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-14 09:00:00', '22222222-2222-2222-2222-100000000003', '2f3c252c-4745-4c73-8a85-04db699889c8',  80,  22.40,  72.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-14 09:00:00', '22222222-2222-2222-2222-100000000003', 'b5571bdb-ac41-492b-8def-91a7c541a782',  40,  48.00, 160.00),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000d3b001', gen_random_uuid(), 'demo_seed_registers', 'sale', true, '2026-05-14 09:00:00', '22222222-2222-2222-2222-100000000003', 'e831c1e4-6e20-4cf1-8940-a349e95fbe75',  70,  29.40,  77.00);

COMMIT;

-- Summary
SELECT 'AR_charge' AS kind, COUNT(*) AS rows, SUM(amount) AS total
FROM movement_sales_accounts_receivable
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001' AND doc_type = 'demo_seed_registers' AND kind = 'charge'
UNION ALL
SELECT 'AR_payment', COUNT(*), SUM(amount)
FROM movement_sales_accounts_receivable
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001' AND doc_type = 'demo_seed_registers' AND kind = 'payment'
UNION ALL
SELECT 'AP_charge', COUNT(*), SUM(amount)
FROM movement_purchases_accounts_payable
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001' AND doc_type = 'demo_seed_registers' AND kind = 'charge'
UNION ALL
SELECT 'AP_payment', COUNT(*), SUM(amount)
FROM movement_purchases_accounts_payable
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001' AND doc_type = 'demo_seed_registers' AND kind = 'payment'
UNION ALL
SELECT 'Sales_lines', COUNT(*), SUM(revenue)
FROM movement_sales_sale
WHERE tenant_id = '00000000-0000-0000-0000-000000d3b001' AND doc_type = 'demo_seed_registers';
