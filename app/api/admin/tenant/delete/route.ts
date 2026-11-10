import { requireTenantContext } from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HARD_DELETE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'owner:tenant_delete')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const confirmation = String(body.confirmation ?? '');
  const force = Boolean(body.force ?? false);

  if (confirmation !== ctx.tenant.slug) {
    return NextResponse.json({ error: 'confirmation_mismatch' }, { status: 400 });
  }

  // Determine if deletion is allowed
  let allowed = false;
  if (ctx.tenant.deletedAt) {
    const archivedAt = new Date(ctx.tenant.deletedAt);
    const now = new Date();
    if (now.getTime() - archivedAt.getTime() > HARD_DELETE_WINDOW_MS) {
      allowed = true;
    }
  }

  if (!allowed && force) {
    // Double confirmation for force delete
    const doubleConfirm = String(body.doubleConfirm ?? '');
    if (doubleConfirm === `DELETE ${ctx.tenant.slug}`) {
      allowed = true;
    } else {
      return NextResponse.json(
        { error: 'double_confirmation_required', hint: `Type DELETE ${ctx.tenant.slug}` },
        { status: 400 },
      );
    }
  }

  if (!allowed) {
    return NextResponse.json(
      { error: 'not_ready_for_deletion', hint: 'Wait 30 days after archive or use force delete' },
      { status: 400 },
    );
  }

  const tenantSlug = ctx.tenant.slug;
  const tenantName = ctx.tenant.name;
  const deletedBy = ctx.user.id;
  const clerkOrgId = ctx.tenant.clerkOrgId;

  // Cascade delete all tenant data inside transaction
  await withBypass(async (tx) => {
    await tx.tenant.delete({ where: { id: ctx.tenant.id } });
  });

  // Record deletion log outside transaction
  await prisma.tenantDeletionLog.create({
    data: {
      tenantSlug,
      tenantName,
      deletedBy,
      metadata: { clerkOrgId, forced: force },
    },
  });

  // Delete Clerk org outside transaction
  try {
    const clerk = await clerkClient();
    await clerk.organizations.deleteOrganization(clerkOrgId);
  } catch {
    // Best effort — org may already be gone or API may fail
  }

  // Sign user out
  const { redirectToSignIn } = await auth();
  redirectToSignIn();

  return NextResponse.json({ ok: true });
}
