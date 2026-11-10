import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DAYS_UNTIL_HARD_DELETE = 30;

export async function POST(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'owner:tenant_archive')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const confirmation = String(body.confirmation ?? '');
  if (confirmation !== ctx.tenant.slug) {
    return NextResponse.json({ error: 'confirmation_mismatch' }, { status: 400 });
  }

  const now = new Date();
  const archivedAt = now;
  const restorableUntil = new Date(now.getTime() + DAYS_UNTIL_HARD_DELETE * 24 * 60 * 60 * 1000);

  await withTenant(ctx.tenant.id, async (tx) => {
    await tx.tenant.update({
      where: { id: ctx.tenant.id },
      data: { deletedAt: now, archivedBy: ctx.user.id },
    });

    await tx.auditLog.create({
      data: {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        entity: 'tenant',
        entityId: ctx.tenant.id,
        action: 'archive',
        after: { deletedAt: now.toISOString(), archivedBy: ctx.user.id },
      },
    });
  });

  // Sign user out via Clerk
  const { redirectToSignIn } = await auth();
  redirectToSignIn();

  return NextResponse.json({
    ok: true,
    archivedAt: archivedAt.toISOString(),
    restorableUntil: restorableUntil.toISOString(),
  });
}
