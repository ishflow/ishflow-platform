import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { exportTenantSnapshot } from '@/platform/super-admin/tenants/tenant-ops';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  const session = await assertSuperAdmin();
  const { tenantId } = await ctx.params;
  const h = await headers();

  const payload = await exportTenantSnapshot(tenantId, {
    actorUserId: session.user.id,
    actorClerkId: session.user.clerkId,
    ip: h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `tenant_${payload.tenant.slug}_${stamp}.json`;

  const body = JSON.stringify(payload, (_key, value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'bigint') return value.toString();
    return value;
  });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
