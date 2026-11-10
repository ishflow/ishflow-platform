import { withBypass } from '@/platform/db/tenant-context';

export interface SaMemberView {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  roleIds: string[];
  roleNames: string[];
  createdAt: Date;
}

export interface SaTenantRolesView {
  members: SaMemberView[];
  availableRoles: Array<{ id: string; name: string }>;
}

export async function loadSaTenantMembers(tenantId: string): Promise<SaTenantRolesView> {
  return withBypass(async (tx) => {
    const [memberships, roles] = await Promise.all([
      tx.membership.findMany({
        where: { tenantId },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          roles: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      tx.role.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const members: SaMemberView[] = memberships.map((m) => {
      const full = [m.user.firstName ?? '', m.user.lastName ?? ''].join(' ').trim();
      return {
        membershipId: m.id,
        userId: m.userId,
        email: m.user.email,
        fullName: full.length > 0 ? full : null,
        roleIds: m.roles.map((r) => r.id),
        roleNames: m.roles.map((r) => r.name),
        createdAt: m.createdAt,
      };
    });

    return { members, availableRoles: roles };
  });
}
