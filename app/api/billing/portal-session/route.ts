import { resolveContext } from '@/platform/auth/current-context';
import { createPortalSession } from '@/platform/billing/create-portal';
import { isSubscriptionPaymentsEnabledAsync } from '@/platform/billing/feature-state';
import { withBypass } from '@/platform/db/tenant-context';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ctx.tenant) return NextResponse.json({ error: 'no_tenant' }, { status: 403 });
  // Honor the global payments gate (see checkout-session/route.ts).
  if (!(await isSubscriptionPaymentsEnabledAsync())) {
    return NextResponse.json({ error: 'payments_disabled' }, { status: 403 });
  }
  const isOwner =
    (ctx.membership as unknown as { roles?: Array<{ name: string }> } | null)?.roles?.some(
      (r) => r.name === 'owner',
    ) ?? false;
  if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const tenantId = ctx.tenant.id;
  const tenant = await withBypass((tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantId } }));
  if (!tenant.stripeCustomerId) {
    return NextResponse.json(
      { error: 'no_customer', message: 'Upgrade to a paid plan first' },
      { status: 400 },
    );
  }

  const result = await createPortalSession({
    tenant,
    returnUrl: `${req.nextUrl.origin}/settings/billing`,
  });
  return NextResponse.json(result);
}
