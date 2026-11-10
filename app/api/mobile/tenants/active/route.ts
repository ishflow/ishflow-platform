import { resolveContext } from '@/platform/auth/current-context';
import { signMobileJWT } from '@/platform/auth/mobile-jwt';
import { prisma } from '@/platform/db';
import {
  SetActiveTenantBodySchema,
  SetActiveTenantResponseSchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mobile/tenants/active — switch the active tenant by re-minting
 * the mobile bearer JWT with a new `tenantId` claim.
 *
 * Security: the membership lookup is the load-bearing check. Without it any
 * authenticated user could mint a token for a tenant they don't belong to,
 * because `signMobileJWT` blindly trusts whatever `tenantId` the caller
 * supplies. The 403 path is covered by tests for that reason.
 *
 * The new token replaces the keychain-stored bearer on the iOS side; the
 * old token remains valid until expiry but is harmless — it carries the
 * previous tenant claim, which the bearer path validates against the live
 * membership table on every request.
 */
export async function POST(req: Request): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = SetActiveTenantBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const member = await prisma.membership.findFirst({
    where: { userId: ctx.user.id, tenantId: parsed.data.tenantId },
  });
  if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // JWT `sub` (claims.userId) MUST be the Clerk user id — that is what
  // `resolveBearerContext` uses for `findUnique({ where: { clerkId } })`.
  // Signing the platform UUID would make every subsequent bearer-mode API
  // call 401 silently. See the round-trip regression test in
  // app/api/mobile/auth/bridge/route.test.ts and the POST assertion in
  // app/api/mobile/tenants/route.test.ts.
  const token = await signMobileJWT({
    userId: ctx.user.clerkId,
    tenantId: parsed.data.tenantId,
    scopes: [...ctx.permissions],
  });

  return NextResponse.json(SetActiveTenantResponseSchema.parse({ token }));
}
