import { renderUserAuditTab } from '@/lib/v2-super-admin/tabs/user-audit-content';
import { renderUserMembershipsTab } from '@/lib/v2-super-admin/tabs/user-memberships-content';
import { renderUserOverviewTab } from '@/lib/v2-super-admin/tabs/user-overview-content';
import {
  defineSuperAdminCatalog,
  defineSuperAdminCatalogDetail,
  defineSuperAdminCatalogTab,
} from '@/platform/metadata';

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'user',
  label: {
    ru: 'Пользователь',
    en: 'User',
    tr: 'Kullanıcı',
    ky: 'Колдонуучу',
    uz: 'Foydalanuvchi',
    de: 'Benutzer',
    fr: 'Utilisateur',
    zh: '用户',
  },
  pluralLabel: {
    ru: 'Пользователи',
    en: 'Users',
    tr: 'Kullanıcılar',
    ky: 'Колдонуучулар',
    uz: 'Foydalanuvchilar',
    de: 'Benutzer',
    fr: 'Utilisateurs',
    zh: '用户列表',
  },
  displayField: 'email',
  requiredPermission: 'super_admin.user:read',
  fields: {
    email: { type: 'string', label: { ru: 'Email', en: 'Email', tr: 'E-posta' } },
    fullName: { type: 'string', label: { ru: 'Имя', en: 'Name', tr: 'Ad' } },
    clerkId: { type: 'string', label: { ru: 'Clerk ID', en: 'Clerk ID', tr: 'Clerk ID' } },
    memberships: { type: 'number', label: { ru: 'Тенанты', en: 'Tenants', tr: 'Kiracılar' } },
    createdAt: { type: 'date', label: { ru: 'Создан', en: 'Joined', tr: 'Katıldı' } },
    status: {
      type: 'string',
      label: { ru: 'Статус', en: 'Status', tr: 'Durum' },
      enumValues: ['active', 'deleted'] as const,
    },
  },
  list: {
    layout: 'table',
    searchable: true,
    detailHref: (id) => `/super-admin/users/${id}`,
    columns: [
      { key: 'email', label: { ru: 'Email', en: 'Email', tr: 'E-posta' } },
      { key: 'fullName', label: { ru: 'Имя', en: 'Name', tr: 'Ad' } },
      { key: 'clerkId', label: { ru: 'Clerk ID', en: 'Clerk ID', tr: 'Clerk ID' } },
      { key: 'memberships', label: { ru: 'Тен.', en: 'Tenants', tr: 'Kir.' } },
      { key: 'createdAt', label: { ru: 'Создан', en: 'Joined', tr: 'Katıldı' } },
      { key: 'status', label: { ru: 'Статус', en: 'Status', tr: 'Durum' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'active', label: { ru: 'Активные', en: 'Active', tr: 'Aktif' } },
      { key: 'deleted', label: { ru: 'Удалённые', en: 'Deleted', tr: 'Silinmiş' } },
      {
        key: 'multitenant',
        label: { ru: 'Мульти-тенант', en: 'Multi-tenant', tr: 'Çoklu kiracı' },
      },
    ],
  },
  loader: async ({ tx, search, chip, page, pageSize }) => {
    const txTyped = tx as {
      user: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            clerkId: string;
            createdAt: Date;
            deletedAt: Date | null;
            _count: { memberships: number };
          }>
        >;
        count: (args: unknown) => Promise<number>;
      };
    };

    const where: Record<string, unknown> = {};
    if (search) {
      const trimmed = search.trim();
      where.OR = [
        { email: { contains: trimmed, mode: 'insensitive' } },
        { firstName: { contains: trimmed, mode: 'insensitive' } },
        { lastName: { contains: trimmed, mode: 'insensitive' } },
        { clerkId: trimmed },
      ];
    }
    if (chip === 'active') {
      where.deletedAt = null;
    } else if (chip === 'deleted') {
      where.deletedAt = { not: null };
    }
    // `multitenant` is handled post-query because Prisma cannot filter by
    // `_count` aggregate in `where`. For first-prod scale this is fine; revisit
    // if user count grows beyond a few thousand.

    if (chip === 'multitenant') {
      // Fetch a larger page, post-filter, then slice. Cap at 500 to stay safe.
      const wide = await txTyped.user.findMany({
        where,
        include: { _count: { select: { memberships: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      const multi = wide.filter((u) => u._count.memberships > 1);
      const total = multi.length;
      const start = (page - 1) * pageSize;
      const rows = multi.slice(start, start + pageSize).map(toRow);
      return { rows, total };
    }

    const [users, total] = await Promise.all([
      txTyped.user.findMany({
        where,
        include: { _count: { select: { memberships: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      txTyped.user.count({ where }),
    ]);

    return { rows: users.map(toRow), total };
  },
  detail: defineSuperAdminCatalogDetail({
    tabs: [
      defineSuperAdminCatalogTab({
        key: 'overview',
        segment: '',
        icon: 'User',
        render: renderUserOverviewTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'memberships',
        segment: 'memberships',
        icon: 'Users',
        render: renderUserMembershipsTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'audit',
        segment: 'audit',
        icon: 'ShieldCheck',
        render: renderUserAuditTab,
      }),
    ],
  }),
});

function toRow(u: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  clerkId: string;
  createdAt: Date;
  deletedAt: Date | null;
  _count: { memberships: number };
}) {
  const fullName =
    [u.firstName, u.lastName].filter((p): p is string => Boolean(p?.trim())).join(' ') || null;
  return {
    id: u.id,
    email: u.email,
    fullName: fullName ?? '—',
    clerkId: u.clerkId,
    memberships: u._count.memberships,
    createdAt: u.createdAt,
    status: u.deletedAt ? 'deleted' : 'active',
  };
}
