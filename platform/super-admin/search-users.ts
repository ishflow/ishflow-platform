import { withBypass } from '@/platform/db/tenant-context';

export interface UserSearchMembership {
  tenantId: string;
  tenantName: string;
  roleNames: string[];
}

export interface UserSearchResult {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  memberships: UserSearchMembership[];
}

/**
 * Global user search across all tenants. Operator-only — runs with
 * `withBypass` so cross-tenant results are visible.
 *
 * Matches on (case-insensitive):
 *   - exact `clerkId`
 *   - `email` ILIKE %q%
 *   - `firstName` ILIKE %q%
 *   - `lastName` ILIKE %q%
 *
 * Returns at most 50 rows ordered by most-recent first. A trimmed query
 * shorter than 2 chars returns an empty array — prevents accidental
 * full-table scans.
 */
export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  return withBypass(async (tx) => {
    const users = await tx.user.findMany({
      where: {
        OR: [
          { clerkId: trimmed },
          { email: { contains: trimmed, mode: 'insensitive' } },
          { firstName: { contains: trimmed, mode: 'insensitive' } },
          { lastName: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: 50,
      include: {
        memberships: {
          include: {
            tenant: { select: { name: true } },
            roles: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      deletedAt: u.deletedAt,
      memberships: u.memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        roleNames: m.roles.map((r) => r.name),
      })),
    }));
  });
}
