import { type RoleMember, type ScopeRow, V2RoleDetail } from '@/components/v2/admin/roles/detail';
import type { PermRow } from '@/components/v2/admin/roles/permission-matrix';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { resolveContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

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

// Map each i18n module → the platform entity prefixes that contribute to its
// row in the permission matrix. A row's "read" cell is on when at least one
// listed entity grants read; same for write/delete. "Post" applies only to
// document entities (catalogs are 'na').
type ModuleSpec = {
  key: string;
  entities: string[];
  catalogOnly?: boolean;
};

const MODULES: ModuleSpec[] = [
  { key: 'products', entities: ['inventory.product'], catalogOnly: true },
  { key: 'customers', entities: ['sales.customer'], catalogOnly: true },
  { key: 'salesInvoices', entities: ['sales.invoice'] },
  { key: 'purchaseInvoices', entities: ['purchases.invoice'] },
  {
    key: 'stockMovements',
    entities: [
      'inventory.stock_adjustment',
      'inventory.stock_transfer',
      'inventory.inventory_count',
    ],
  },
  {
    key: 'payments',
    entities: ['sales.payment_received', 'purchases.payment_sent'],
  },
  { key: 'reports', entities: ['reports'], catalogOnly: true },
  { key: 'periodClose', entities: ['admin.period_close'] },
  { key: 'workspaceSettings', entities: ['admin.organization'], catalogOnly: true },
];

type Cell = 'on' | 'off' | 'na';

function cellFor(grantedSet: Set<string>, entities: string[], action: string): Cell {
  // 'on' when at least one of the entities grants the action.
  for (const ent of entities) {
    if (hasPermission(grantedSet, `${ent}:${action}`)) return 'on';
  }
  return 'off';
}

export default async function V2RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('v2_admin.roles.detail');
  const tNames = await getTranslations('v2_admin.members.role');
  const tMods = await getTranslations('v2_admin.roles.modules');

  const ctx = await resolveContext();
  if (!ctx?.tenant) {
    notFound();
  }
  const tenantId = ctx.tenant.id;

  const role = await withTenant(tenantId, (tx) =>
    tx.role.findFirst({
      where: { id },
      include: {
        scopes: true,
        memberships: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  );

  if (!role) {
    notFound();
  }

  const grantedSet = new Set<string>(role.permissions);

  const permissionRows: PermRow[] = MODULES.map((m) => {
    const readCell = cellFor(grantedSet, m.entities, 'read');
    const writeCell = cellFor(grantedSet, m.entities, 'write');
    const deleteCell = cellFor(grantedSet, m.entities, 'delete');
    const postCell = m.catalogOnly ? ('na' as Cell) : cellFor(grantedSet, m.entities, 'post');
    return {
      module: tMods(`${m.key}.tr`),
      sub: tMods(`${m.key}.ru`),
      actions: [readCell, writeCell, writeCell, deleteCell, postCell],
    };
  });

  // Active permission count: number of distinct `entity:action` literals in
  // role.permissions (excluding wildcards). Caps the matrix counter.
  const explicitGrants = role.permissions.filter((p) => !p.includes('*'));
  const activeCount = explicitGrants.length;
  const totalCount = 86;

  // Scope rows: real RoleScope rows. If none configured, omit the section
  // entirely (rendered with empty array — the section header still shows).
  const scopeRows: ScopeRow[] = role.scopes.map((s) => {
    const filter = `${s.field} ${operatorLabel(s.operator)} ${JSON.stringify(s.value)}`;
    return {
      entity: s.entityId,
      entitySub: '',
      filter,
      actions: [{ label: t('actions.read'), tone: 'neutral' }],
    };
  });

  const PALETTE = [
    '#7C3AED',
    '#0EA5E9',
    '#16A34A',
    '#DC2626',
    '#F59E0B',
    '#A21CAF',
    '#0F766E',
    '#475569',
    '#1E40AF',
  ];
  const members: RoleMember[] = role.memberships.map((m, idx) => {
    const u = m.user;
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      u.email.split('@')[0] ||
      u.email;
    const initials =
      ((u.firstName ?? '').slice(0, 1) + (u.lastName ?? '').slice(0, 1)).toUpperCase() ||
      u.email.slice(0, 2).toUpperCase();
    return {
      initials,
      color: PALETTE[idx % PALETTE.length] ?? '#475569',
      name,
      email: u.email,
      lastSeen: '',
    };
  });

  const roleKey = ROLE_KEY_MAP[role.name] ?? role.name;
  const titleName = ROLE_KEY_MAP[role.name] ? tNames(roleKey) : role.name;
  const nameRu = safeT(t, `russianFor.${roleKey}`, '');
  const description = role.description ?? safeT(t, `builtinDescription.${roleKey}`, '');

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb', { name: titleName })}
        title={titleName}
        subtitle={t('subtitle', { ru: nameRu, count: members.length })}
      />
      <div className="content">
        <V2RoleDetail
          isSystem={role.isSystem}
          labels={{
            systemAlertTitle: t('systemAlertTitle'),
            systemAlertBody: t('systemAlertBody'),
            systemAlertCopy: t('systemAlertCopy'),
            saveCta: t('saveCta'),
            cancel: t('cancel'),
            lastUpdated: t('lastUpdated', {
              when: formatTs(role.updatedAt),
            }),
            fields: {
              sectionTitle: t('fields.sectionTitle'),
              name: t('fields.name'),
              nameRu: t('fields.nameRu'),
              description: t('fields.description'),
              scope: t('fields.scope'),
              scopeAll: t('fields.scopeAll'),
              scopeAssigned: t('fields.scopeAssigned'),
            },
            permission: {
              title: t('permission.title'),
              counterLabel: t('permission.counterLabel'),
              cols: {
                module: t('permission.col.module'),
                read: t('permission.col.read'),
                create: t('permission.col.create'),
                update: t('permission.col.update'),
                delete: t('permission.col.delete'),
                post: t('permission.col.post'),
              },
            },
            scopeSection: {
              title: t('scopeSection.title'),
              desc: t('scopeSection.desc'),
              cols: {
                entity: t('scopeSection.col.entity'),
                filter: t('scopeSection.col.filter'),
                appliedActions: t('scopeSection.col.appliedActions'),
              },
              addRuleCta: t('scopeSection.addRuleCta'),
            },
            membersSection: {
              title: t('membersSection.title'),
              viewAll: t('membersSection.viewAll'),
              meta: (when: string) => when,
              addMemberCta: t('membersSection.addMemberCta'),
            },
          }}
          defaults={{ name: titleName, nameRu, description }}
          permissionRows={permissionRows}
          permissionCounts={{ active: activeCount, total: totalCount }}
          scopeRows={scopeRows}
          members={members}
        />
      </div>
    </>
  );
}

function operatorLabel(op: string): string {
  switch (op) {
    case 'EQ':
      return '=';
    case 'IN':
      return 'IN';
    case 'CONTEXT_EQ':
      return '= currentUser.';
    default:
      return op;
  }
}

function formatTs(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function safeT(
  t: Awaited<ReturnType<typeof getTranslations<'v2_admin.roles.detail'>>>,
  key: string,
  fallback: string,
): string {
  try {
    return t(key as never);
  } catch {
    return fallback;
  }
}
