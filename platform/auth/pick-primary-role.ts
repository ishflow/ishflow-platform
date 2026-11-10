export const ROLE_PRIORITY: Record<string, number> = {
  owner: 0,
  admin: 1,
  chief_accountant: 2,
  bookkeeper: 3,
  cashier: 4,
  buyer: 5,
  sales: 6,
  warehouse: 7,
  viewer: 8,
};

/**
 * Pick the highest-privilege role name from a list of role names.
 *
 * Priority (highest first):
 *   owner > admin > chief_accountant > bookkeeper > cashier > buyer
 *   > sales > warehouse > viewer > <custom>
 *
 * Unknown/custom roles are treated as lower than all known roles.
 */
export function pickPrimaryRoleName(membershipRoles: Array<{ name: string }>): string {
  const first = membershipRoles[0];
  if (!first) return 'viewer';

  let best = first.name;
  let bestRank = ROLE_PRIORITY[best] ?? Number.POSITIVE_INFINITY;

  for (let i = 1; i < membershipRoles.length; i++) {
    const role = membershipRoles[i];
    if (!role) continue;
    const name = role.name;
    const rank = ROLE_PRIORITY[name] ?? Number.POSITIVE_INFINITY;
    if (rank < bestRank) {
      best = name;
      bestRank = rank;
    }
  }

  return best;
}
