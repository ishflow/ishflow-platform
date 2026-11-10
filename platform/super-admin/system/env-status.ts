/**
 * Env var configuration audit. Reports presence/absence of curated keys
 * grouped by integration. Values are NEVER returned — only `configured`
 * (truthy + non-empty) vs `missing`.
 */

export interface EnvVarStatus {
  key: string;
  configured: boolean;
}

export interface EnvVarGroup {
  group: string;
  items: EnvVarStatus[];
}

const ENV_ALLOWLIST: ReadonlyArray<{ group: string; keys: string[] }> = [
  {
    group: 'Clerk',
    keys: [
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_WEBHOOK_SECRET',
      'CLERK_JWT_KEY',
      'MOBILE_JWT_SECRET',
    ],
  },
  {
    group: 'Stripe',
    keys: [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_PRICE_STARTER',
      'STRIPE_PRICE_PRO',
      'STRIPE_PRICE_BUSINESS',
      'STRIPE_PRICE_ENTERPRISE',
    ],
  },
  {
    group: 'Resend',
    keys: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
  },
  {
    group: 'AI Gateway',
    keys: ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_BASE_URL', 'AI_GATEWAY_MODEL'],
  },
  {
    group: 'R2 (Cloudflare)',
    keys: [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET',
      'R2_PUBLIC_BASE_URL',
    ],
  },
  {
    group: 'Vercel',
    keys: [
      'VERCEL_DEPLOYMENT_ID',
      'VERCEL_API_TOKEN',
      'VERCEL_TEAM_ID',
      'VERCEL_GIT_COMMIT_SHA',
      'VERCEL_URL',
    ],
  },
  {
    group: 'Database',
    keys: ['DATABASE_URL', 'DIRECT_URL'],
  },
];

function isConfigured(rawValue: string | undefined): boolean {
  if (rawValue === undefined) return false;
  return rawValue.trim().length > 0;
}

export function getEnvVarStatus(env: NodeJS.ProcessEnv = process.env): EnvVarGroup[] {
  return ENV_ALLOWLIST.map((g) => ({
    group: g.group,
    items: g.keys.map((key) => ({
      key,
      configured: isConfigured(env[key]),
    })),
  }));
}
