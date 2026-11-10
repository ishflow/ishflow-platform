import { withBypass } from '@/platform/db/tenant-context';
import { cache } from 'react';

export type SaUserMembership = {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleNames: string[];
  joinedAt: Date;
};

export type SaUserAuditEntry = {
  id: string;
  action: string;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: Date;
};

export type SaUserRecord = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  status: 'active' | 'deleted';
  memberships: SaUserMembership[];
  recentAudit: SaUserAuditEntry[];
};

/**
 * Per-request cached single-user loader for the V2 super-admin user detail
 * page. Runs inside `withBypass` (cross-tenant). Returns null on missing user.
 *
 * Scoped narrower than V1's `loadUserDetail` (no Clerk session list, no push
 * tokens) — those land when their own tabs do (Faz C.1.1 ships overview only).
 */
export const loadSaUser = cache(async (userId: string): Promise<SaUserRecord | null> => {
  return withBypass(async (tx) => {
    const txTyped = tx as {
      user: {
        findUnique: (args: unknown) => Promise<
          | (Record<string, unknown> & {
              id: string;
              clerkId: string;
              email: string;
              firstName: string | null;
              lastName: string | null;
              imageUrl: string | null;
              createdAt: Date;
              deletedAt: Date | null;
              memberships: Array<{
                id: string;
                tenantId: string;
                createdAt: Date;
                tenant: { id: string; name: string; slug: string };
                roles: Array<{ name: string }>;
              }>;
            })
          | null
        >;
      };
      platformAuditLog: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            action: string;
            tenantId: string | null;
            createdAt: Date;
          }>
        >;
      };
      tenant: {
        findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
      };
    };

    const u = await txTyped.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
            roles: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!u) return null;

    const recentAuditRows = await txTyped.platformAuditLog.findMany({
      where: { actorClerkId: u.clerkId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, action: true, tenantId: true, createdAt: true },
    });

    const tenantIds = Array.from(
      new Set(recentAuditRows.map((r) => r.tenantId).filter((x): x is string => x !== null)),
    );
    const tenants = tenantIds.length
      ? await txTyped.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [];
    const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]));

    const fullName =
      [u.firstName, u.lastName].filter((p): p is string => Boolean(p?.trim())).join(' ') || null;

    return {
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName,
      imageUrl: u.imageUrl,
      createdAt: u.createdAt,
      deletedAt: u.deletedAt,
      status: u.deletedAt ? 'deleted' : 'active',
      memberships: u.memberships.map((m) => ({
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
        tenantName: r.tenantId ? (tenantNameById.get(r.tenantId) ?? null) : null,
        createdAt: r.createdAt,
      })),
    };
  });
});
