import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { hasPermission } from '@/platform/engine/permissions';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new Response('unauthorized', { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'admin.members:manage')) {
    return new Response('forbidden', { status: 403 });
  }

  const result = await withTenant(ctx.tenant.id, async (tx) => {
    const ownerCount = await tx.membership.count({
      where: {
        tenantId: ctx.tenant.id,
        roles: { some: { name: 'owner', isSystem: true } },
      },
    });

    if (ownerCount > 0) {
      return { error: 'tenant already has an owner', status: 400 };
    }

    const callerMembership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: ctx.tenant.id, userId: ctx.user.id } },
      include: { roles: true },
    });

    if (!callerMembership) {
      return { error: 'caller membership not found', status: 404 };
    }

    const isAdmin = callerMembership.roles.some((r) => r.name === 'admin' && r.isSystem);
    if (!isAdmin) {
      return { error: 'caller must be admin', status: 403 };
    }

    const ownerRole = await tx.role.findFirst({
      where: { tenantId: ctx.tenant.id, name: 'owner', isSystem: true },
    });

    if (!ownerRole) {
      return { error: 'owner role not found', status: 500 };
    }

    await tx.membership.update({
      where: { id: callerMembership.id },
      data: {
        roles: {
          connect: { id: ownerRole.id },
        },
      },
    });

    await writeAudit(tx, ctx, {
      entity: 'tenant.recover_ownership',
      entityId: ctx.tenant.id,
      action: 'update',
      before: {
        ownerless: true,
        recoveredByMembershipId: callerMembership.id,
      },
      after: {
        ownerless: false,
        recoveredByMembershipId: callerMembership.id,
        recoveredByUserId: ctx.user.id,
        recoveredAt: new Date().toISOString(),
      },
    });

    return { ok: true };
  });

  if ('error' in result) {
    return new Response(result.error, { status: result.status });
  }

  revalidatePath('/admin/members');
  return Response.json({ ok: true });
}
