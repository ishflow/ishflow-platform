import { renderTenantActivityTab } from '@/lib/v2-super-admin/tabs/tenant-activity-content';
import { renderTenantAddonsTab } from '@/lib/v2-super-admin/tabs/tenant-addons-content';
import { renderTenantDebugTab } from '@/lib/v2-super-admin/tabs/tenant-debug-content';
import { renderTenantDocumentsTab } from '@/lib/v2-super-admin/tabs/tenant-documents-content';
import { renderTenantNotesTab } from '@/lib/v2-super-admin/tabs/tenant-notes-content';
import { renderTenantOverridesTab } from '@/lib/v2-super-admin/tabs/tenant-overrides-content';
import { renderTenantOverviewTab } from '@/lib/v2-super-admin/tabs/tenant-overview-content';
import { renderTenantSubscriptionTab } from '@/lib/v2-super-admin/tabs/tenant-subscription-content';
import { renderTenantTagsTab } from '@/lib/v2-super-admin/tabs/tenant-tags-content';
import { renderTenantTimelineTab } from '@/lib/v2-super-admin/tabs/tenant-timeline-content';
import { renderTenantUsersTab } from '@/lib/v2-super-admin/tabs/tenant-users-content';
import { renderTenantVitalsTab } from '@/lib/v2-super-admin/tabs/tenant-vitals-content';
import { monthlyUsd } from '@/platform/billing/mrr';
import {
  defineSuperAdminCatalog,
  defineSuperAdminCatalogDetail,
  defineSuperAdminCatalogTab,
} from '@/platform/metadata';

type PlanKey = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

// Plan-vs-status chip routing. Plan keys filter where.plan; status keys
// filter where.status. Kept here (not in DSL) because the chip→column
// mapping is entity-specific.
const PLAN_CHIPS = new Set<string>(['free', 'starter', 'pro', 'business', 'enterprise']);
const STATUS_CHIP_MAP: Record<string, string> = {
  trial: 'trialing',
  suspended: 'suspended',
};

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'tenant',
  label: {
    ru: 'Тенант',
    en: 'Tenant',
    tr: 'Kiracı',
    ky: 'Кардар',
    uz: 'Ijaračı',
    de: 'Mandant',
    fr: 'Locataire',
    zh: '租户',
  },
  pluralLabel: {
    ru: 'Тенанты',
    en: 'Tenants',
    tr: 'Kiracılar',
    ky: 'Кардарлар',
    uz: 'Ijaračılar',
    de: 'Mandanten',
    fr: 'Locataires',
    zh: '租户列表',
  },
  displayField: 'name',
  requiredPermission: 'super_admin.tenant:read',
  fields: {
    name: { type: 'string', label: { ru: 'Название', en: 'Name', tr: 'Ad' } },
    slug: { type: 'string', label: { ru: 'Slug', en: 'Slug', tr: 'Slug' } },
    plan: {
      type: 'string',
      label: { ru: 'Тариф', en: 'Plan', tr: 'Plan' },
      enumValues: ['free', 'starter', 'pro', 'business', 'enterprise'] as const,
    },
    status: {
      type: 'string',
      label: { ru: 'Статус', en: 'Status', tr: 'Durum' },
      enumValues: ['active', 'trialing', 'past_due', 'suspended', 'cancelled', 'deleted'] as const,
    },
    defaultLocale: { type: 'string', label: { ru: 'Локаль', en: 'Locale', tr: 'Yerel' } },
    mrrUsd: { type: 'number', label: { ru: 'MRR (USD)', en: 'MRR (USD)', tr: 'MRR (USD)' } },
    members: { type: 'number', label: { ru: 'Участники', en: 'Members', tr: 'Üyeler' } },
    invoices: { type: 'number', label: { ru: 'Документы', en: 'Invoices', tr: 'Belgeler' } },
    lastActivityAt: {
      type: 'date',
      label: { ru: 'Активность', en: 'Last activity', tr: 'Son etkinlik' },
    },
  },
  list: {
    layout: 'table',
    searchable: true,
    listOnly: true,
    detailHref: (id) => `/super-admin/tenants/${id}`,
    columns: [
      { key: 'name', label: { ru: 'Название', en: 'Name', tr: 'Ad' } },
      { key: 'slug', label: { ru: 'Slug', en: 'Slug', tr: 'Slug' } },
      { key: 'plan', label: { ru: 'Тариф', en: 'Plan', tr: 'Plan' } },
      { key: 'mrrUsd', label: { ru: 'MRR', en: 'MRR', tr: 'MRR' } },
      { key: 'members', label: { ru: 'Уч.', en: 'Members', tr: 'Üye' } },
      { key: 'invoices', label: { ru: 'Док.', en: 'Inv', tr: 'Bel.' } },
      {
        key: 'lastActivityAt',
        label: { ru: 'Активность', en: 'Last activity', tr: 'Son etkinlik' },
      },
      { key: 'status', label: { ru: 'Статус', en: 'Status', tr: 'Durum' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'business', label: { ru: 'Business', en: 'Business', tr: 'Business' } },
      { key: 'pro', label: { ru: 'Pro', en: 'Pro', tr: 'Pro' } },
      { key: 'free', label: { ru: 'Free', en: 'Free', tr: 'Ücretsiz' } },
      { key: 'trial', label: { ru: 'Trial', en: 'Trial', tr: 'Deneme' } },
      { key: 'suspended', label: { ru: 'Приост.', en: 'Suspended', tr: 'Askıda' } },
    ],
  },
  loader: async ({ tx, search, chip, page, pageSize }) => {
    const txTyped = tx as {
      tenant: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            name: string;
            slug: string;
            plan: PlanKey;
            status: string;
            defaultLocale: string;
            currency: string;
            lastActivityAt: Date | null;
            _count: { memberships: number };
          }>
        >;
        count: (args: unknown) => Promise<number>;
      };
      document_sales_invoice: {
        groupBy: (args: unknown) => Promise<Array<{ tenantId: string; _count: { _all: number } }>>;
      };
    };

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (chip && chip !== 'all') {
      const statusValue = STATUS_CHIP_MAP[chip];
      if (statusValue) {
        where.status = statusValue;
      } else if (PLAN_CHIPS.has(chip)) {
        where.plan = chip;
      }
      // Unknown chip keys are silently ignored — keeps the loader robust
      // against stale URLs after chips get reshaped.
    }

    const [tenants, total] = await Promise.all([
      txTyped.tenant.findMany({
        where,
        include: { _count: { select: { memberships: true } } },
        orderBy: { lastActivityAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      txTyped.tenant.count({ where }),
    ]);

    const tenantIds = tenants.map((t) => t.id);
    const invoiceCounts = tenantIds.length
      ? await txTyped.document_sales_invoice.groupBy({
          by: ['tenantId'],
          where: { tenantId: { in: tenantIds } },
          _count: { _all: true },
        })
      : [];
    const invoiceMap = new Map(invoiceCounts.map((g) => [g.tenantId, g._count._all]));

    return {
      rows: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.status,
        defaultLocale: t.defaultLocale,
        mrrUsd: monthlyUsd(t.plan),
        members: t._count.memberships,
        invoices: invoiceMap.get(t.id) ?? 0,
        lastActivityAt: t.lastActivityAt,
      })),
      total,
    };
  },
  detail: defineSuperAdminCatalogDetail({
    tabs: [
      defineSuperAdminCatalogTab({
        key: 'overview',
        segment: '',
        icon: 'LayoutDashboard',
        render: renderTenantOverviewTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'activity',
        segment: 'activity',
        icon: 'Activity',
        render: renderTenantActivityTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'addons',
        segment: 'addons',
        icon: 'Zap',
        render: renderTenantAddonsTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'debug',
        segment: 'debug',
        icon: 'Terminal',
        render: renderTenantDebugTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'documents',
        segment: 'documents',
        icon: 'FileText',
        badge: '218',
        render: renderTenantDocumentsTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'notes',
        segment: 'notes',
        icon: 'Edit3',
        badge: '3',
        render: renderTenantNotesTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'overrides',
        segment: 'overrides',
        icon: 'Sliders',
        render: renderTenantOverridesTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'subscription',
        segment: 'subscription',
        icon: 'CreditCard',
        render: renderTenantSubscriptionTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'tags',
        segment: 'tags',
        icon: 'Tag',
        badge: '5',
        render: renderTenantTagsTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'timeline',
        segment: 'timeline',
        icon: 'GitCommit',
        render: renderTenantTimelineTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'users',
        segment: 'users',
        icon: 'Users',
        badge: '4',
        render: renderTenantUsersTab,
      }),
      defineSuperAdminCatalogTab({
        key: 'vitals',
        segment: 'vitals',
        icon: 'HeartPulse',
        render: renderTenantVitalsTab,
      }),
    ],
  }),
});
