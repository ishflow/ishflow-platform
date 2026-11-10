-- AlterTable: add totalCost resource column to the stock_balance movement register
-- Additive only — no drops, no renames.
ALTER TABLE "movement_inventory_stock_balance" ADD COLUMN "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0;
