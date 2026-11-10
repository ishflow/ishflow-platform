import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '.env.local' });

const PLACEHOLDER_PATTERN = /^PLACEHOLDER_/;

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
  MOBILE_JWT_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  BILLING_ENFORCEMENT: z.enum(['off', 'warn', 'on']).default('off'),
  SUBSCRIPTION_PAYMENTS_ENABLED: z
    .enum(['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'])
    .default('false'),
  NEXT_PUBLIC_WEB_BASE_URL: z.string().url().optional(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('Environment validation failed:');
  for (const issue of result.error.issues) {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

console.info('✓ All required env vars present.');

const subscriptionKeys = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
] as const;
const placeholders = subscriptionKeys.filter((k) => {
  const v = process.env[k];
  return v !== undefined && PLACEHOLDER_PATTERN.test(v);
});
const missing = subscriptionKeys.filter((k) => !process.env[k]);
if (placeholders.length > 0) {
  console.warn(
    `⚠ Subscription system not yet activated — placeholder values in: ${placeholders.join(', ')}`,
  );
  console.warn('  Replace via 1Password the Stripe and Resend items in your secret manager.');
} else if (missing.length > 0) {
  console.warn(`⚠ Subscription env vars missing (optional): ${missing.join(', ')}`);
} else {
  console.info('✓ Subscription env vars set (Stripe + Resend).');
}

if (
  process.env.BILLING_ENFORCEMENT &&
  !['off', 'warn', 'on'].includes(process.env.BILLING_ENFORCEMENT)
) {
  console.error(
    `✗ BILLING_ENFORCEMENT must be off|warn|on, got: ${process.env.BILLING_ENFORCEMENT}`,
  );
  process.exit(1);
}

async function liveCheck(databaseUrl: string) {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const rows = await client.$queryRawUnsafe<
      Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
    >('SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
    const row = rows[0];
    if (!row) {
      console.error('✗ Live check: pg_roles lookup returned nothing.');
      process.exit(1);
    }
    console.info(
      `✓ DATABASE_URL role: ${row.current_user} (rolsuper=${row.rolsuper}, rolbypassrls=${row.rolbypassrls})`,
    );
    if (row.rolsuper || row.rolbypassrls) {
      console.error(
        '✗ Runtime role can bypass RLS. Fix DATABASE_URL or the role before deploying.',
      );
      process.exit(1);
    }
  } finally {
    await client.$disconnect();
  }
}

if (process.argv.includes('--live')) {
  liveCheck(result.data.DATABASE_URL).catch((err) => {
    console.error('✗ Live check error:', err);
    process.exit(1);
  });
}
