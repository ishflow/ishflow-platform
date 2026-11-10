# Inject with: op inject -i .env.local.tpl -o .env.local
# DATABASE_URL = non-superuser, RLS-enforced; DIRECT_URL = migrations only
DATABASE_URL="postgresql://canalog_app:canalog_app_dev_password@localhost:5432/canalog_dev?schema=public"
DIRECT_URL="postgresql://canalog:canalog_dev_password@localhost:5432/canalog_dev?schema=public"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="op://<vault>/<item>/publishable_key"
CLERK_SECRET_KEY="op://<vault>/<item>/secret_key"
CLERK_WEBHOOK_SIGNING_SECRET="op://<vault>/<item>/webhook_signing_secret"
MOBILE_JWT_SECRET="op://<vault>/<item>/secret"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/v2/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/v2/onboarding/welcome"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cloudflare R2 — Sprint 23 file attachments. Bucket is private; app uses signed URLs only.
R2_ACCOUNT_ID="op://<vault>/<item>/account_id"
R2_ACCESS_KEY_ID="op://<vault>/<item>/access_key_id"
R2_SECRET_ACCESS_KEY="op://<vault>/<item>/secret_access_key"
R2_BUCKET="op://<vault>/<item>/bucket"
R2_PUBLIC_URL="op://<vault>/<item>/public_url"

# Optional — if you have multiple Clerk orgs synced into the dev DB, seed
# needs to know which one to populate. Leave unset when there is only one
# real tenant (seed auto-detects).
# SEED_TENANT_CLERK_ORG_ID="org_..."

# Stripe — subscription system (PR #92). Test mode keys; rotate before prod.
# Replace placeholders in the 1Password item after creating the Stripe account
# (Dashboard → Developers → API keys, then register a webhook for the signing secret).
STRIPE_SECRET_KEY="op://<vault>/<item>/secret_key"
STRIPE_PUBLISHABLE_KEY="op://<vault>/<item>/publishable_key"
STRIPE_WEBHOOK_SECRET="op://<vault>/<item>/webhook_secret"

# Resend — trial-end + transactional emails.
RESEND_API_KEY="op://<vault>/<item>/api_key"
EMAIL_FROM_ADDRESS="op://<vault>/<item>/from_address"

# Recipient for operator notifications (manual upgrade requests, etc.). The
# notify helper falls back to owner@example.com when unset; set the real
# value in the production Vercel env + local .env.local.
SUPER_ADMIN_NOTIFY_EMAIL="owner@example.com"

# Master subscription payments gate. Default false → Stripe Checkout/Portal
# buttons render disabled with "Contact admin" copy; billing UI stays visible
# so users can see plan matrix + trial countdown. Flip to "true" only after
# Stripe credentials are configured (Kyrgyzstan ships without Stripe initially).
SUBSCRIPTION_PAYMENTS_ENABLED="false"

# Subscription enforcement gate. Values: off | warn | on.
# Default off keeps existing flows untouched. Flip to warn for a week, then on.
BILLING_ENFORCEMENT="off"

# Base URL used by /api/mobile/billing/handoff to build the web redirect URL.
NEXT_PUBLIC_WEB_BASE_URL="http://localhost:3100"

# Vercel AI Gateway — powers premium AI add-ons (ai_invoice_ocr).
# Auto-provisioned on Vercel deployments; set manually for local dev.
# AI_GATEWAY_API_KEY="op://<vault>/<item>/api_key"
# Optional direct-provider fallback when the gateway is not configured.
# ANTHROPIC_API_KEY="op://<vault>/<item>/api_key"

# ---------------------------------------------------------------------------
# PRODUCTION (set in Vercel → Project → Settings → Environment Variables,
# Production scope ONLY — never in this local template):
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_...   (Clerk Production instance)
#   CLERK_SECRET_KEY                  = sk_live_...
#   CLERK_WEBHOOK_SIGNING_SECRET      = (prod webhook signing secret)
#   NEXT_PUBLIC_APP_URL               = https://ishflow.com
#   SUPER_ADMIN_CLERK_USER_IDS        = <your prod Clerk user id>  (set AFTER first signup)
#   DEV_AUTH_BYPASS                   = (MUST be absent in prod)
# 1Password item for live keys: "<item>" in vault "<vault>".
# ---------------------------------------------------------------------------
