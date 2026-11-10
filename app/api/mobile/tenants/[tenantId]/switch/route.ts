import { resolveContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import { signMobileJWT } from '@/platform/auth/mobile-jwt';
import {
  SwitchTenantResponseSchema,
  UuidSchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';
import { buildPermissionAndScopeData } from '@/platform/auth/current-context';

export const dynamic = 'force-dynamic';

/**
 * Switch the mobile session to a different tenant. The caller must already
 * be signed in (any bearer/cookie) AND have an active membership in the
 * target tenant. On success returns a fresh mobile JWT pinned to that
 * tenant; the iOS app replaces its stored token and refetches `/me`.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { tenantId: rawTenantId } = await context.params;
  const parsed = UuidSchema.safeParse(rawTenantId);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_tenant_id' }, { status: 400 });
  }
  const tenantId = parsed.data;

  // Verify the user has an active membership in the target tenant.
  const membership = await withBypass(async (tx) => {
    return tx.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: ctx.user.id } },
      include: {
        tenant: { select: { id: true, deletedAt: true } },
        roles: { include: { scopes: true } },
      },
    });
  });

  if (!membership || !membership.tenant || membership.tenant.deletedAt) {
    return NextResponse.json({ error: 'membership_not_found' }, { status: 403 });
  }

  const { permissions } = buildPermissionAndScopeData(
    membership.roles as Array<{
      id: string;
      permissions: string[];
      scopes: Array<{
        entityId: string;
        field: string;
        operator: import('@prisma/client').ScopeOperator;
        value: unknown;
      }>;
    }>,
  );

  const token = await signMobileJWT({
    userId: ctx.user.clerkId,
    tenantId,
    scopes: [...permissions],
  });

  const body = SwitchTenantResponseSchema.parse({ token });
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
