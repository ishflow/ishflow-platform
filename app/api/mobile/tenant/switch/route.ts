import { resolveContext, resolveFromClerkClaims, toMeResponse } from '@/platform/auth/current-context';
import { pickPrimaryRoleName } from '@/platform/auth/pick-primary-role';
import { selectFabActions, selectTabs } from '@/lib/mobile/tab-registry';
import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';
import { MeResponseSchema } from '@ishflow/mobile-api-contract';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const TenantSwitchRequestSchema = z.object({ tenantId: z.string().min(1) });

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = TenantSwitchRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { tenantId } = parsed.data;

  // tenantId is the DB tenant UUID (as returned by /api/mobile/me). Verify the
  // user has an active membership in the target tenant via the DB, and pull
  // the matching Clerk org id so we can sync Clerk metadata afterwards.
  const target = await withBypass(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: ctx.user.id } },
      include: { tenant: { select: { id: true, clerkOrgId: true, deletedAt: true } } },
    });
    if (!membership || !membership.tenant || membership.tenant.deletedAt) return null;
    return membership.tenant;
  });

  if (!target) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const clerk = await clerkClient();
  // lastActiveOrganizationId is not supported in this Clerk version
  await clerk.users.updateUserMetadata(ctx.user.clerkId, {
    publicMetadata: { activeTenantId: tenantId },
  });

  // Re-resolve bypassing React cache. Prefer the Clerk org id; if the target
  // tenant has no Clerk org backing (super-admin-provisioned tenants), fall
  // back to its DB UUID — resolveFromClerkClaims tolerates both shapes and
  // a deterministic DB lookup avoids the Clerk publicMetadata read-after-write
  // eventual-consistency race.
  const fresh = await resolveFromClerkClaims({
    userId: ctx.user.clerkId,
    orgId: target.clerkOrgId ?? target.id,
  });
  if (!fresh) {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  const base = toMeResponse(fresh);
  const role = pickPrimaryRoleName(
    (fresh.membership as unknown as { roles: Array<{ name: string }> } | null)?.roles ?? [],
  );

  const body = MeResponseSchema.parse({
    ...base,
    primaryRole: role,
    tabs: selectTabs(fresh),
    fabActions: selectFabActions(fresh),
  });

  return NextResponse.json(body);
}
