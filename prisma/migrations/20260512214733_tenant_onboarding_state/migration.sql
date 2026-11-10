-- Add tenant-level onboarding state JSON column.
-- Stores { dismissed, completedSteps[], demoLoaded } for the web onboarding
-- wizard (welcome dialog + dashboard checklist). Nullable; defaults to NULL
-- so existing tenants pick up the shape lazily via getOnboardingState().

ALTER TABLE "tenant" ADD COLUMN "onboarding_state" JSONB;
