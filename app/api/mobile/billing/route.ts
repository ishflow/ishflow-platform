import { resolveContext } from '@/platform/auth/current-context';
import { effectiveLimits } from '@/platform/billing/effective-limits';
import {
  getSubscriptionFeatureState,
  isSubscriptionPaymentsEnabledAsync,
} from '@/platform/billing/feature-flags';
import { getUsage } from '@/platform/billing/usage';
import { withBypass } from '@/platform/db/tenant-context';
import { BillingResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ctx.tenant) return NextResponse.json({ error: 'no_tenant' }, { status: 403 });

  const state = await getSubscriptionFeatureState();
  if (state === 'hidden') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const tenantId = ctx.tenant.id;
  const tenant = await withBypass((tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantId } }));
  const [usage, limits, paymentsEnabled] = await Promise.all([
    getUsage(tenant.id),
    effectiveLimits({
      id: tenant.id,
      plan: tenant.plan,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
    }),
    isSubscriptionPaymentsEnabledAsync(),
  ]);

  const body = BillingResponseSchema.parse({
    plan: tenant.plan,
    status: tenant.status,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    stripeCustomerId: tenant.stripeCustomerId,
    stripeSubscriptionId: tenant.stripeSubscriptionId,
    currency: tenant.currency,
    limits,
    usage,
    paymentsEnabled,
  });
  return NextResponse.json(body);
}
