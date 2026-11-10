/**
 * Server-side data loader for the Super Admin user detail page.
 *
 * Returns identity, memberships (cross-tenant), recent audit entries
 * authored by the user, push tokens, and Clerk sessions. Everything runs
 * inside `withBypass` because the operator is acting outside of any
 * particular tenant.
 *
 * Clerk session list is fetched on a best-effort basis — if the SDK call
 * fails, the page still renders with an empty `sessions` array (the failure
 * is logged) so we never 500 the whole detail view because of a Clerk
 * outage.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';

export interface UserDetailMembership {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleNames: string[];
  joinedAt: Date;
}

export interface UserDetailAuditEntry {
  id: string;
  action: string;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: Date;
}

export interface UserDetailPushToken {
  id: string;
  tenantId: string;
  tenantName: string | null;
  platform: string;
  deviceName: string | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface UserDetailSession {
  id: string;
  status: string;
  lastActiveAt: number | null;
  expireAt: number | null;
  clientId: string | null;
}

export interface UserDetail {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  memberships: UserDetailMembership[];
  recentAudit: UserDetailAuditEntry[];
  pushTokens: UserDetailPushToken[];
  sessions: UserDetailSession[];
  sessionsError: boolean;
}

/** Load the full SA user-detail bundle. Returns `null` when the user id is unknown. */
export async function loadUserDetail(userId: string): Promise<UserDetail | null> {
  const dbBundle = await withBypass(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const memberships = await tx.membership.findMany({
      where: { userId: user.id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        roles: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const recentAuditRows = await tx.platformAuditLog.findMany({
      where: { actorClerkId: user.clerkId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const auditTenantIds = Array.from(
      new Set(recentAuditRows.map((r) => r.tenantId).filter((x): x is string => !!x)),
    );
    const auditTenants =
      auditTenantIds.length > 0
        ? await tx.tenant.findMany({
            where: { id: { in: auditTenantIds } },
            select: { id: true, name: true },
          })
        : [];
    const auditTenantName = new Map(auditTenants.map((t) => [t.id, t.name]));

    const pushTokens = await tx.devicePushToken.findMany({
      where: { userId: user.id },
      orderBy: { lastUsedAt: 'desc' },
    });
    const pushTenantIds = Array.from(new Set(pushTokens.map((t) => t.tenantId)));
    const pushTenants =
      pushTenantIds.length > 0
        ? await tx.tenant.findMany({
            where: { id: { in: pushTenantIds } },
            select: { id: true, name: true },
          })
        : [];
    const pushTenantName = new Map(pushTenants.map((t) => [t.id, t.name]));

    return { user, memberships, recentAuditRows, auditTenantName, pushTokens, pushTenantName };
  });

  if (!dbBundle) return null;

  const { user, memberships, recentAuditRows, auditTenantName, pushTokens, pushTenantName } =
    dbBundle;

  // Clerk sessions — soft-fail so a Clerk outage doesn't blank the page.
  let sessions: UserDetailSession[] = [];
  let sessionsError = false;
  try {
    const clerk = await clerkClient();
    const result = await clerk.sessions.getSessionList({ userId: user.clerkId });
    const raw = (Array.isArray(result) ? result : (result?.data ?? [])) as Array<{
      id: string;
      status: string;
      lastActiveAt: number | null;
      expireAt: number | null;
      clientId: string | null;
    }>;
    sessions = raw.map((s) => ({
      id: s.id,
      status: s.status,
      lastActiveAt: s.lastActiveAt ?? null,
      expireAt: s.expireAt ?? null,
      clientId: s.clientId ?? null,
    }));
  } catch (err) {
    console.error('[super-admin user-detail] clerk sessions list failed', err);
    sessionsError = true;
  }

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
    memberships: memberships.map((m) => ({
      membershipId: m.id,
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      roleNames: m.roles.map((r) => r.name),
      joinedAt: m.createdAt,
    })),
    recentAudit: recentAuditRows.map((r) => ({
      id: r.id,
      action: r.action,
      tenantId: r.tenantId,
      tenantName: r.tenantId ? (auditTenantName.get(r.tenantId) ?? null) : null,
      createdAt: r.createdAt,
    })),
    pushTokens: pushTokens.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      tenantName: pushTenantName.get(t.tenantId) ?? null,
      platform: t.platform,
      deviceName: t.deviceName,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    })),
    sessions,
    sessionsError,
  };
}
