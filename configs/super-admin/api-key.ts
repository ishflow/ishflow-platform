import { revokeApiKeyAction } from '@/lib/v2-super-admin/api-key-actions';
import { defineSuperAdminCatalog } from '@/platform/metadata';

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'api_key',
  label: {
    ru: 'API-ключ',
    en: 'API key',
    tr: 'API anahtarı',
    ky: 'API ачкычы',
    uz: 'API kaliti',
    de: 'API-Schlüssel',
    fr: 'Clé API',
    zh: 'API 密钥',
  },
  pluralLabel: {
    ru: 'API-ключи',
    en: 'API keys',
    tr: 'API anahtarları',
    ky: 'API ачкычтары',
    uz: 'API kalitlari',
    de: 'API-Schlüssel',
    fr: 'Clés API',
    zh: 'API 密钥',
  },
  displayField: 'name',
  requiredPermission: 'super_admin.api_key:read',
  fields: {
    name: { type: 'string', label: { ru: 'Название', en: 'Name', tr: 'Ad' } },
    keyPrefix: { type: 'string', label: { ru: 'Префикс', en: 'Prefix', tr: 'Ön ek' } },
    tenantName: { type: 'string', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
    scope: { type: 'string', label: { ru: 'Скоуп', en: 'Scope', tr: 'Kapsam' } },
    lastUsedAt: { type: 'date', label: { ru: 'Использован', en: 'Last used', tr: 'Son kullanım' } },
    createdAt: { type: 'date', label: { ru: 'Создан', en: 'Created', tr: 'Oluşturuldu' } },
    status: {
      type: 'string',
      label: { ru: 'Статус', en: 'Status', tr: 'Durum' },
      enumValues: ['active', 'revoked'] as const,
    },
  },
  list: {
    layout: 'table',
    searchable: true,
    listOnly: true,
    columns: [
      { key: 'name', label: { ru: 'Название', en: 'Name', tr: 'Ad' } },
      { key: 'tenantName', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
      { key: 'keyPrefix', label: { ru: 'Префикс', en: 'Prefix', tr: 'Ön ek' } },
      { key: 'scope', label: { ru: 'Скоуп', en: 'Scope', tr: 'Kapsam' } },
      { key: 'lastUsedAt', label: { ru: 'Использован', en: 'Last used', tr: 'Son kullanım' } },
      { key: 'createdAt', label: { ru: 'Создан', en: 'Created', tr: 'Oluşturuldu' } },
      { key: 'status', label: { ru: 'Статус', en: 'Status', tr: 'Durum' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'active', label: { ru: 'Активные', en: 'Active', tr: 'Aktif' } },
      { key: 'revoked', label: { ru: 'Отозванные', en: 'Revoked', tr: 'İptal' } },
    ],
    rowActions: [
      {
        key: 'revoke',
        label: { ru: 'Отозвать', en: 'Revoke', tr: 'İptal' },
        icon: 'X',
        action: revokeApiKeyAction,
        variant: 'destructive',
        visibleWhen: (r) => r.status === 'active',
        hiddenFieldsFromRow: { apiKeyId: (r) => r.id as string },
        dialog: {
          type: 'confirm',
          title: { ru: 'Отозвать ключ?', en: 'Revoke API key?', tr: 'API anahtarını iptal et?' },
          description: {
            ru: 'Ключ перестанет работать немедленно. Это действие нельзя отменить.',
            en: 'The key stops working immediately. This action cannot be undone.',
            tr: 'Anahtar derhal çalışmayı durdurur. Bu işlem geri alınamaz.',
          },
          confirm: { ru: 'Отозвать', en: 'Revoke', tr: 'İptal' },
          pending: { ru: 'Отзыв…', en: 'Revoking…', tr: 'İptal ediliyor…' },
          destructive: true,
        },
      },
    ],
  },
  source: {
    source: 'apiKey',
    searchFields: ['name', 'keyPrefix'],
    chipFilters: {
      active: { revokedAt: null },
      revoked: { revokedAt: { not: null } },
    },
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
    map: (r) => {
      const tenant = r.tenant as { id: string; name: string };
      return {
        id: r.id as string,
        name: r.name,
        keyPrefix: r.keyPrefix,
        tenantName: tenant.name,
        scope: r.scope,
        lastUsedAt: r.lastUsedAt,
        createdAt: r.createdAt,
        status: r.revokedAt ? 'revoked' : 'active',
      };
    },
  },
});
