-- Tenant display currency. Additive — existing rows default to USD.
ALTER TABLE "tenant" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
