import { defineSuperAdminCatalog } from '@/platform/metadata';

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'billing_event',
  label: {
    ru: 'Биллинг-событие',
    en: 'Billing event',
    tr: 'Faturalandırma olayı',
    ky: 'Биллинг окуясы',
    uz: 'Hisob-kitob hodisasi',
    de: 'Abrechnungsereignis',
    fr: 'Évén. de facturation',
    zh: '计费事件',
  },
  pluralLabel: {
    ru: 'Биллинг',
    en: 'Billing events',
    tr: 'Faturalandırma olayları',
    ky: 'Биллинг окуялары',
    uz: 'Hisob-kitob hodisalari',
    de: 'Abrechnungsereignisse',
    fr: 'Évén. de facturation',
    zh: '计费事件列表',
  },
  displayField: 'type',
  requiredPermission: 'super_admin.billing_event:read',
  fields: {
    type: { type: 'string', label: { ru: 'Тип', en: 'Type', tr: 'Tür' } },
    tenantName: { type: 'string', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
    stripeEventId: { type: 'string', label: { ru: 'Stripe ID', en: 'Stripe ID', tr: 'Stripe ID' } },
    processedAt: {
      type: 'datetime',
      label: { ru: 'Обработано', en: 'Processed', tr: 'İşlendi' },
    },
    createdAt: { type: 'datetime', label: { ru: 'Создан', en: 'Received', tr: 'Alındı' } },
    status: {
      type: 'string',
      label: { ru: 'Статус', en: 'Status', tr: 'Durum' },
      enumValues: ['processed', 'pending', 'failed'] as const,
    },
  },
  list: {
    layout: 'table',
    searchable: true,
    listOnly: true,
    columns: [
      { key: 'createdAt', label: { ru: 'Создан', en: 'Received', tr: 'Alındı' } },
      { key: 'type', label: { ru: 'Тип', en: 'Type', tr: 'Tür' } },
      { key: 'tenantName', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
      { key: 'stripeEventId', label: { ru: 'Stripe ID', en: 'Stripe ID', tr: 'Stripe ID' } },
      { key: 'processedAt', label: { ru: 'Обработано', en: 'Processed', tr: 'İşlendi' } },
      { key: 'status', label: { ru: 'Статус', en: 'Status', tr: 'Durum' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'processed', label: { ru: 'Обработано', en: 'Processed', tr: 'İşlendi' } },
      { key: 'pending', label: { ru: 'Ожидает', en: 'Pending', tr: 'Bekliyor' } },
      { key: 'failed', label: { ru: 'Ошибка', en: 'Failed', tr: 'Hata' } },
    ],
  },
  source: {
    source: 'billingEvent',
    searchFields: ['type', 'stripeEventId'],
    chipFilters: {
      processed: { processedAt: { not: null }, processingError: null },
      pending: { processedAt: null },
      failed: { processingError: { not: null } },
    },
    include: { tenant: { select: { id: true, name: true } } },
    map: (e) => {
      const tenant = e.tenant as { id: string; name: string } | null;
      return {
        id: e.id as string,
        createdAt: e.createdAt,
        type: e.type,
        tenantName: tenant?.name ?? '—',
        stripeEventId: e.stripeEventId,
        processedAt: e.processedAt,
        status: e.processingError ? 'failed' : e.processedAt ? 'processed' : 'pending',
      };
    },
  },
});
