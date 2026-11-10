import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { SUPER_IMPERSONATE_COOKIE, signCookie } from '@/platform/auth/super-impersonate';
import { withBypass } from '@/platform/db/tenant-context';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const ctx = await assertSuperAdmin();
  const { tenantId } = await params;
  const h = await headers();

  const tenant = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
  if (!tenant) {
    return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });
  }

  const cookieValue = await signCookie({ actorClerkId: ctx.user.clerkId, tenantId });

  await withBypass((tx) =>
    tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'impersonate.start',
        tenantId,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    }),
  );

  const res = NextResponse.redirect(new URL('/dashboard', req.url), { status: 303 });
  res.cookies.set(SUPER_IMPERSONATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });
  return res;
}
