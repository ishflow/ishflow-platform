import { type RoleRow, V2RolesList } from '@/components/v2/admin/roles/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

// DB role.name (snake_case) → i18n key under v2_admin.members.role /
// v2_admin.roles.systemDesc. Unknown names render with their DB name
// verbatim — fine for custom roles.
const ROLE_KEY_MAP: Record<string, string> = {
  owner: 'owner',
  admin: 'admin',
  chief_accountant: 'chiefAccountant',
  bookkeeper: 'accountant',
  cashier: 'cashier',
  sales: 'salesManager',
  buyer: 'salesManager',
  warehouse: 'warehouse',
  viewer: 'viewer',
};

const KNOWN_DESC_KEYS = new Set([
  'owner',
  'admin',
  'chiefAccountant',
  'accountant',
  'cashier',
  'salesManager',
  'warehouse',
  'viewer',
]);

function knownKeyFor(name: string): string | null {
  return ROLE_KEY_MAP[name] ?? null;
}

export default async function V2RolesPage() {
  const t = await getTranslations('v2_admin.roles');
  const tNames = await getTranslations('v2_admin.members.role');
  const tDesc = await getTranslations('v2_admin.roles.systemDesc');

  let tenantId = '';
  let perms = new Set<string>();
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant.id;
    perms = ctx.permissions;
  } catch {
    // Unauthenticated — render chrome with empty list.
  }

  // Role management is admin-only (a partial-admin like chief_accountant must
  // not reach it even though they pass the /admin/* layout gate).
  if (tenantId && !hasPermission(perms, 'admin.members:manage')) notFound();

  const data = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const roles = await tx.role.findMany({
          orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
          include: { _count: { select: { memberships: true } } },
        });
        return roles;
      })
    : [];

  const rows: RoleRow[] = data.map((r) => {
    const key = knownKeyFor(r.name);
    // Display name: i18n label for known roles, raw DB name for custom ones.
    const displayName = key ? tNames(key) : r.name;
    // Description: i18n systemDesc for known roles, DB description otherwise,
    // empty string as last resort.
    const description = key && KNOWN_DESC_KEYS.has(key) ? tDesc(key) : (r.description ?? '');
    // "Permissions" column: count length, with 'owner' getting the ∞ glyph
    // since its permission list is treated as catch-all (`*:*`).
    const permLabel = r.name === 'owner' ? '∞' : String(r.permissions.length);
    return {
      id: r.id,
      name: displayName,
      description,
      permissions: permLabel,
      members: r._count.memberships,
      type: r.isSystem ? 'system' : 'custom',
    };
  });

  const total = rows.length;
  const systemCount = rows.filter((r) => r.type === 'system').length;
  const customCount = rows.filter((r) => r.type === 'custom').length;

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: total })}
      />
      <div className="content">
        <V2RolesList
          labels={{
            chipAll: t('list.chipAll'),
            chipSystem: t('list.chipSystem'),
            chipCustom: t('list.chipCustom'),
            searchPh: t('list.searchPh'),
            newRole: t('list.newRole'),
            columns: {
              name: t('list.col.name'),
              description: t('list.col.description'),
              permissions: t('list.col.permissions'),
              members: t('list.col.members'),
              type: t('list.col.type'),
            },
            typeSystem: t('list.typeSystem'),
            typeCustom: t('list.typeCustom'),
            pageInfo: t('list.pageInfo', { count: total }),
          }}
          counts={{ all: total, system: systemCount, custom: customCount }}
          rows={rows}
          newHref="/admin/roles/new"
          detailHref={(id) => `/admin/roles/${id}`}
        />
      </div>
    </>
  );
}
