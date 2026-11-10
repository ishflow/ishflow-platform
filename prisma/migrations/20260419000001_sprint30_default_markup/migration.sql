-- Sprint 30: tenant-level default markup used as fallback by resolvePrice
ALTER TABLE "tenant"
  ADD COLUMN "default_markup_pct" NUMERIC(5, 4) NOT NULL DEFAULT 0.10;
