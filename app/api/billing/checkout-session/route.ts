import { resolveContext } from '@/platform/auth/current-context';
import { createCheckoutSession } from '@/platform/billing/create-checkout';
import { isSubscriptionPaymentsEnabledAsync } from '@/platform/billing/feature-state';
import { withBypass } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RequestSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  interval: z.enum(['month', 'year']),
});

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!ctx.tenant) {
    return NextResponse.json({ error: 'no_tenant' }, { status: 403 });
  }

  // Honor the global payments gate. When the subscription feature-state is
  // `disabled`/`hidden` (manual-upgrade regions), Stripe self-serve is off and
  // the billing UI shows "request upgrade". Reject server-side so the disabled
  // UI cannot be bypassed by POSTing directly to this route.
  if (!(await isSubscriptionPaymentsEnabledAsync())) {
    return NextResponse.json({ error: 'payments_disabled' }, { status: 403 });
  }

  // Permission gate: admin.billing:manage is sealed (only granted via
  // `owner` or explicit billing-admin role). hasPermission consults the
  // resolved AppContext permission set, so a custom role with the perm
  // is also honored.
  if (!hasPermission(ctx.permissions, 'admin.billing:manage')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Load a fresh Tenant row (the membership-cached ctx.tenant may not
  // include the latest stripeCustomerId after a concurrent checkout).
  const tenantId = ctx.tenant.id;
  const tenant = await withBypass((tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantId } }));

  const origin = req.nextUrl.origin;
  const result = await createCheckoutSession({
    tenant,
    plan: parsed.data.plan,
    interval: parsed.data.interval,
    successUrl: `${origin}/settings/billing?session=success`,
    cancelUrl: `${origin}/settings/billing?session=canceled`,
  });

  return NextResponse.json(result);
}
