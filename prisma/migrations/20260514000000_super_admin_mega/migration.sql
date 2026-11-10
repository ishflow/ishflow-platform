-- ═══════════════════════════════════════════════════════════════════════
--  Super Admin Mega — unified migration for super-admin-pro,
--  in-app-communications, marketing-site sub-projects.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── ENUMS ─────────────────────────────────────────────────────────────

CREATE TYPE "support_ticket_status" AS ENUM ('open', 'in_progress', 'resolved', 'wont_fix');
CREATE TYPE "announcement_surface" AS ENUM ('banner', 'popup', 'feed_only');
CREATE TYPE "announcement_status" AS ENUM ('draft', 'scheduled', 'live', 'archived');
CREATE TYPE "blog_post_status" AS ENUM ('draft', 'published', 'archived');

-- ─── A. Super Admin Pro tables ─────────────────────────────────────────

CREATE TABLE "tenant_tag" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'zinc',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    CONSTRAINT "tenant_tag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_tag_tenant_id_label_key" ON "tenant_tag"("tenant_id", "label");
ALTER TABLE "tenant_tag"
  ADD CONSTRAINT "tenant_tag_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_note" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    CONSTRAINT "tenant_note_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tenant_note_tenant_id_created_at_idx" ON "tenant_note"("tenant_id", "created_at");
ALTER TABLE "tenant_note"
  ADD CONSTRAINT "tenant_note_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_suspension" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "suspended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspended_by" UUID NOT NULL,
    "lifted_at" TIMESTAMP(3),
    "lifted_by" UUID,
    CONSTRAINT "tenant_suspension_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_suspension_tenant_id_key" ON "tenant_suspension"("tenant_id");
ALTER TABLE "tenant_suspension"
  ADD CONSTRAINT "tenant_suspension_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_feature_kill" (
    "tenant_id" UUID NOT NULL,
    "feature_key" TEXT NOT NULL,
    "reason" TEXT,
    "killed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "killed_by" UUID NOT NULL,
    CONSTRAINT "tenant_feature_kill_pkey" PRIMARY KEY ("tenant_id", "feature_key")
);
ALTER TABLE "tenant_feature_kill"
  ADD CONSTRAINT "tenant_feature_kill_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_price_override" (
    "tenant_id" UUID NOT NULL,
    "monthly_price_usd" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    CONSTRAINT "tenant_price_override_pkey" PRIMARY KEY ("tenant_id")
);
ALTER TABLE "tenant_price_override"
  ADD CONSTRAINT "tenant_price_override_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "support_ticket" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url_captured" TEXT,
    "browser_agent" TEXT,
    "status" "support_ticket_status" NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_ticket_status_created_at_idx" ON "support_ticket"("status", "created_at");
CREATE INDEX "support_ticket_tenant_id_idx" ON "support_ticket"("tenant_id");

CREATE TABLE "cron_run" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "output" TEXT,
    "error_message" TEXT,
    CONSTRAINT "cron_run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cron_run_job_name_started_at_idx" ON "cron_run"("job_name", "started_at");

CREATE TABLE "platform_metric_daily" (
    "day" DATE NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "tags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_metric_daily_pkey" PRIMARY KEY ("day", "key")
);

CREATE TABLE "platform_audit_saved_filter" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_clerk_id" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_saved_filter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_audit_saved_filter_owner_clerk_id_idx" ON "platform_audit_saved_filter"("owner_clerk_id");

-- ─── B. In-App Communications tables ───────────────────────────────────

CREATE TABLE "marketing_announcement" (
    "id" UUID NOT NULL,
    "internal_key" TEXT NOT NULL,
    "surface" "announcement_surface" NOT NULL,
    "status" "announcement_status" NOT NULL DEFAULT 'draft',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "targeting" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_announcement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_announcement_internal_key_key" ON "marketing_announcement"("internal_key");
CREATE INDEX "marketing_announcement_status_start_at_idx" ON "marketing_announcement"("status", "start_at");

CREATE TABLE "marketing_announcement_translation" (
    "announcement_id" UUID NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    CONSTRAINT "marketing_announcement_translation_pkey" PRIMARY KEY ("announcement_id", "locale")
);
ALTER TABLE "marketing_announcement_translation"
  ADD CONSTRAINT "mat_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "marketing_announcement_version" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    CONSTRAINT "marketing_announcement_version_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mav_announcement_id_created_at_idx" ON "marketing_announcement_version"("announcement_id", "created_at");
ALTER TABLE "marketing_announcement_version"
  ADD CONSTRAINT "mav_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_announcement_state" (
    "user_id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "clicked_through_at" TIMESTAMP(3),
    "impression_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "user_announcement_state_pkey" PRIMARY KEY ("user_id", "announcement_id")
);
CREATE INDEX "uas_announcement_id_idx" ON "user_announcement_state"("announcement_id");
ALTER TABLE "user_announcement_state"
  ADD CONSTRAINT "uas_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── C. Marketing Site tables ──────────────────────────────────────────

CREATE TABLE "marketing_section" (
    "id" UUID NOT NULL,
    "page_key" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "content" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,
    CONSTRAINT "marketing_section_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_section_page_key_section_key_locale_key" ON "marketing_section"("page_key", "section_key", "locale");

CREATE TABLE "marketing_section_version" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    CONSTRAINT "marketing_section_version_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "msv_section_id_created_at_idx" ON "marketing_section_version"("section_id", "created_at");
ALTER TABLE "marketing_section_version"
  ADD CONSTRAINT "msv_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "marketing_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "blog_post" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "blog_post_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "hero_image_url" TEXT,
    "author_name" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "blog_post_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blog_post_slug_key" ON "blog_post"("slug");
CREATE INDEX "blog_post_status_published_at_idx" ON "blog_post"("status", "published_at");

CREATE TABLE "blog_post_translation" (
    "post_id" UUID NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    CONSTRAINT "blog_post_translation_pkey" PRIMARY KEY ("post_id", "locale")
);
ALTER TABLE "blog_post_translation"
  ADD CONSTRAINT "bpt_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "blog_post_version" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    CONSTRAINT "blog_post_version_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bpv_post_id_created_at_idx" ON "blog_post_version"("post_id", "created_at");
ALTER TABLE "blog_post_version"
  ADD CONSTRAINT "bpv_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "marketing_lead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "size" TEXT,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "marketing_lead_status_created_at_idx" ON "marketing_lead"("status", "created_at");

CREATE TABLE "marketing_newsletter_subscriber" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_newsletter_subscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_newsletter_subscriber_email_key" ON "marketing_newsletter_subscriber"("email");

-- ═══════════════════════════════════════════════════════════════════════
-- Notes:
-- 1. None of these tables hold tenant-scoped business data that an end user
--    would read directly. They are SA-administered.
-- 2. tenant_*, user_announcement_state — tenant-keyed but accessed via
--    withBypass from SA actions; RLS not added (no end-user reads).
-- 3. marketing_announcement and friends — global tables; reads happen
--    server-side from SA OR tenant context, all via withBypass.
-- 4. marketing_section / blog_post — fully public reads (no tenant key).
-- ═══════════════════════════════════════════════════════════════════════
