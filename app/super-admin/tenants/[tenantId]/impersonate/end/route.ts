import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { SUPER_IMPERSONATE_COOKIE } from '@/platform/auth/super-impersonate';
import { withBypass } from '@/platform/db/tenant-context';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const ctx = await assertSuperAdmin();
  const { tenantId } = await params;
  const h = await headers();

  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'impersonate.end',
        tenantId,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );

  const res = NextResponse.redirect(new URL(`/super-admin/tenants/${tenantId}`, req.url), {
    status: 303,
  });
  res.cookies.delete(SUPER_IMPERSONATE_COOKIE);
  return res;
}
