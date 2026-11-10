import { defineSuperAdminCatalog } from '@/platform/metadata';

const CHIP_PREFIX_MAP: Record<string, string> = {
  tenant: 'tenant.',
  addon: 'addon.',
  tag: 'tag.',
  note: 'note.',
  subscription: 'subscription.',
  override: 'override.',
  member: 'member.',
  user: 'user.',
};

const CHIP_FILTERS = Object.fromEntries(
  Object.entries(CHIP_PREFIX_MAP).map(([chip, prefix]) => [
    chip,
    { action: { startsWith: prefix } },
  ]),
);

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'audit_log',
  label: {
    ru: 'Запись аудита',
    en: 'Audit entry',
    tr: 'Denetim kaydı',
    ky: 'Аудит жазуусу',
    uz: 'Audit yozuvi',
    de: 'Audit-Eintrag',
    fr: 'Entrée d’audit',
    zh: '审计条目',
  },
  pluralLabel: {
    ru: 'Журнал аудита',
    en: 'Audit log',
    tr: 'Denetim günlüğü',
    ky: 'Аудит журналы',
    uz: 'Audit jurnali',
    de: 'Audit-Log',
    fr: 'Journal d’audit',
    zh: '审计日志',
  },
  displayField: 'action',
  requiredPermission: 'super_admin.audit_log:read',
  fields: {
    createdAt: { type: 'datetime', label: { ru: 'Время', en: 'Time', tr: 'Zaman' } },
    action: { type: 'string', label: { ru: 'Действие', en: 'Action', tr: 'Eylem' } },
    tenantName: { type: 'string', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
    actorClerkId: { type: 'string', label: { ru: 'Актор', en: 'Actor', tr: 'Aktör' } },
    ip: { type: 'string', label: { ru: 'IP', en: 'IP', tr: 'IP' } },
  },
  list: {
    layout: 'table',
    searchable: true,
    listOnly: true,
    columns: [
      { key: 'createdAt', label: { ru: 'Время', en: 'Time', tr: 'Zaman' } },
      { key: 'action', label: { ru: 'Действие', en: 'Action', tr: 'Eylem' } },
      { key: 'tenantName', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
      { key: 'actorClerkId', label: { ru: 'Актор', en: 'Actor', tr: 'Aktör' } },
      { key: 'ip', label: { ru: 'IP', en: 'IP', tr: 'IP' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'tenant', label: { ru: 'Тенанты', en: 'Tenant ops', tr: 'Kiracı işl.' } },
      { key: 'subscription', label: { ru: 'Подписки', en: 'Subscription', tr: 'Abonelik' } },
      { key: 'member', label: { ru: 'Участники', en: 'Members', tr: 'Üyeler' } },
      { key: 'addon', label: { ru: 'Аддоны', en: 'Addons', tr: 'Eklentiler' } },
      { key: 'override', label: { ru: 'Override', en: 'Overrides', tr: 'Override' } },
    ],
  },
  source: {
    source: 'platformAuditLog',
    searchFields: ['action'],
    searchExactFields: ['actorClerkId'],
    chipFilters: CHIP_FILTERS,
    orderBy: { createdAt: 'desc' },
    postFetch: async (records, tx) => {
      const txTyped = tx as {
        tenant: {
          findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
        };
      };
      const tenantIds = Array.from(
        new Set(
          records.map((r) => r.tenantId as string | null).filter((x): x is string => x !== null),
        ),
      );
      const tenants = tenantIds.length
        ? await txTyped.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : [];
      const nameById = new Map(tenants.map((t) => [t.id, t.name]));

      return records.map((r) => {
        const tid = r.tenantId as string | null;
        return {
          id: r.id as string,
          createdAt: r.createdAt,
          action: r.action,
          tenantName: tid ? (nameById.get(tid) ?? '—') : '—',
          actorClerkId: r.actorClerkId,
          ip: (r.ip as string | null) ?? '—',
        };
      });
    },
  },
});
