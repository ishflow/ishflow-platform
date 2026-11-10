import { resolveContext } from '@/platform/auth/current-context';
import { effectiveLimits } from '@/platform/billing/effective-limits';
import { getUsage } from '@/platform/billing/usage';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ctx.tenant) return NextResponse.json({ error: 'no_tenant' }, { status: 403 });

  const [usage, limits] = await Promise.all([
    getUsage(ctx.tenant.id),
    effectiveLimits({
      id: ctx.tenant.id,
      plan: ctx.tenant.plan,
      status: ctx.tenant.status,
      trialEndsAt: ctx.tenant.trialEndsAt,
    }),
  ]);
  return NextResponse.json({ usage, limits, plan: ctx.tenant.plan });
}
