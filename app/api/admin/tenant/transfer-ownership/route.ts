import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { hasPermission } from '@/platform/engine/permissions';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new Response('unauthorized', { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'owner:tenant_transfer')) {
    return new Response('forbidden', { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return new Response('invalid body', { status: 400 });
  }

  const { targetMembershipId, confirmation } = body as Record<string, unknown>;
  if (confirmation !== 'TRANSFER') {
    return new Response('invalid confirmation', { status: 400 });
  }

  if (!targetMembershipId || typeof targetMembershipId !== 'string') {
    return new Response('missing targetMembershipId', { status: 400 });
  }

  const result = await withTenant(ctx.tenant.id, async (tx) => {
    const targetMembership = await tx.membership.findUnique({
      where: { id: targetMembershipId },
      include: { roles: true, user: true },
    });

    if (!targetMembership || targetMembership.tenantId !== ctx.tenant.id) {
      return { error: 'target not found', status: 404 };
    }

    if (targetMembership.userId === ctx.user.id) {
      return { error: 'cannot transfer to self', status: 400 };
    }

    const targetIsOwner = targetMembership.roles.some((r) => r.name === 'owner' && r.isSystem);
    if (targetIsOwner) {
      return { error: 'target already owner', status: 400 };
    }

    const ownerRole = await tx.role.findFirst({
      where: { tenantId: ctx.tenant.id, name: 'owner', isSystem: true },
    });
    const adminRole = await tx.role.findFirst({
      where: { tenantId: ctx.tenant.id, name: 'admin', isSystem: true },
    });

    if (!ownerRole || !adminRole) {
      return { error: 'system roles missing', status: 500 };
    }

    const callerMembership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: ctx.tenant.id, userId: ctx.user.id } },
      include: { roles: true },
    });

    if (!callerMembership) {
      return { error: 'caller membership not found', status: 404 };
    }

    const callerHasAdmin = callerMembership.roles.some((r) => r.id === adminRole.id);
    await tx.membership.update({
      where: { id: callerMembership.id },
      data: {
        roles: {
          disconnect: { id: ownerRole.id },
          ...(callerHasAdmin ? {} : { connect: { id: adminRole.id } }),
        },
      },
    });

    await tx.membership.update({
      where: { id: targetMembership.id },
      data: {
        roles: {
          set: [{ id: ownerRole.id }],
        },
      },
    });

    await writeAudit(tx, ctx, {
      entity: 'tenant.transfer_ownership',
      entityId: ctx.tenant.id,
      action: 'update',
      before: {
        fromMembershipId: callerMembership.id,
        fromUserId: callerMembership.userId,
        toMembershipId: targetMembership.id,
        toUserId: targetMembership.userId,
      },
      after: {
        fromMembershipId: callerMembership.id,
        fromUserId: callerMembership.userId,
        toMembershipId: targetMembership.id,
        toUserId: targetMembership.userId,
        transferredAt: new Date().toISOString(),
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
