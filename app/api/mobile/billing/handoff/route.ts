import { resolveContext } from '@/platform/auth/current-context';
import { mintHandoffToken } from '@/platform/billing/mobile-handoff';
import {
  BillingHandoffRequestSchema,
  BillingHandoffResponseSchema,
} from '@ishflow/mobile-api-contract';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://ishflow.com';

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ctx.tenant) return NextResponse.json({ error: 'no_tenant' }, { status: 403 });

  const roles =
    (ctx.membership as unknown as { roles?: Array<{ name: string }> } | null)?.roles ?? [];
  const isOwner = roles.some((r) => r.name === 'owner');
  if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = BillingHandoffRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const token = await mintHandoffToken({
    userId: ctx.user.id,
    tenantId: ctx.tenant.id,
    target: parsed.data.target,
    plan: parsed.data.plan,
    interval: parsed.data.interval,
  });

  const url = new URL(`${WEB_BASE_URL}/billing/handoff`);
  url.searchParams.set('handoff', token);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const body = BillingHandoffResponseSchema.parse({ url: url.toString(), expiresAt });
  return NextResponse.json(body);
}
