'use server';

/**
 * Cross-platform search action for the Super Admin command palette.
 *
 * Operator-only. Returns the top-5 matches per group: tenants (name/slug),
 * users (email/clerkId/firstName/lastName), audit (action token), and addons
 * (catalog key/href).
 *
 * Every category cap is 5 — the palette is meant to surface the obvious hit,
 * not to replace the dedicated list pages. A trimmed query under 2 chars
 * returns an empty payload to keep the action cheap.
 */

import { ADDON_CATALOG, ADDON_KEYS, type AddonKey } from '@/platform/addons/catalog';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';

export interface SearchTenantHit {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly href: string;
}

export interface SearchUserHit {
  readonly id: string;
  readonly clerkId: string;
  readonly email: string;
  readonly displayName: string;
  readonly href: string;
}

export interface SearchAuditHit {
  readonly id: string;
  readonly action: string;
  readonly actorClerkId: string;
  readonly createdAt: string;
  readonly href: string;
}

export interface SearchAddonHit {
  readonly key: AddonKey;
  readonly status: 'ga' | 'beta' | 'planned';
  readonly href: string;
}

export interface SearchPlatformResult {
  readonly query: string;
  readonly tenants: ReadonlyArray<SearchTenantHit>;
  readonly users: ReadonlyArray<SearchUserHit>;
  readonly audit: ReadonlyArray<SearchAuditHit>;
  readonly addons: ReadonlyArray<SearchAddonHit>;
}

const EMPTY_RESULT = (q: string): SearchPlatformResult => ({
  query: q,
  tenants: [],
  users: [],
  audit: [],
  addons: [],
});

const PER_GROUP_LIMIT = 5;

export async function searchPlatformAction(rawQuery: string): Promise<SearchPlatformResult> {
  await assertSuperAdmin();

  const q = rawQuery.trim();
  if (q.length < 2) return EMPTY_RESULT(q);

  // Lowercase for the addon-catalog substring scan; Postgres handles
  // case-insensitivity via `mode: 'insensitive'` for the DB-backed groups.
  const qLower = q.toLowerCase();

  const [tenants, users, audit] = await withBypass(async (tx) =>
    Promise.all([
      tx.tenant.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ lastActivityAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        take: PER_GROUP_LIMIT,
        select: { id: true, name: true, slug: true },
      }),
      tx.user.findMany({
        where: {
          OR: [
            { clerkId: q },
            { email: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: PER_GROUP_LIMIT,
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      }),
      tx.platformAuditLog.findMany({
        where: {
          OR: [
            { action: { contains: q, mode: 'insensitive' } },
            { actorClerkId: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: PER_GROUP_LIMIT,
        select: { id: true, action: true, actorClerkId: true, createdAt: true },
      }),
    ]),
  );

  const tenantHits: SearchTenantHit[] = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    href: `/super-admin/tenants/${t.id}`,
  }));

  const userHits: SearchUserHit[] = users.map((u) => {
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return {
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      displayName: fullName || u.email,
      // /super-admin/users is global; the dedicated per-user route will
      // ship in workstream A.5. Until then we link to the list page —
      // operator can pivot from there.
      href: `/super-admin/users?q=${encodeURIComponent(u.email)}`,
    };
  });

  const auditHits: SearchAuditHit[] = audit.map((r) => ({
    id: r.id,
    action: r.action,
    actorClerkId: r.actorClerkId,
    createdAt: r.createdAt.toISOString(),
    href: `/super-admin/audit?q=${encodeURIComponent(r.action)}`,
  }));

  const addonHits: SearchAddonHit[] = ADDON_KEYS.filter((key) => key.toLowerCase().includes(qLower))
    .slice(0, PER_GROUP_LIMIT)
    .map((key) => {
      const entry = ADDON_CATALOG[key];
      return {
        key: entry.key,
        status: entry.status,
        href: entry.navHref,
      };
    });

  return {
    query: q,
    tenants: tenantHits,
    users: userHits,
    audit: auditHits,
    addons: addonHits,
  };
}
