import { defineSuperAdminCatalog } from '@/platform/metadata';

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'device_push_token',
  label: {
    ru: 'Push-токен',
    en: 'Push token',
    tr: 'Push tokeni',
    ky: 'Push токени',
    uz: 'Push tokeni',
    de: 'Push-Token',
    fr: 'Jeton push',
    zh: '推送令牌',
  },
  pluralLabel: {
    ru: 'Push-токены',
    en: 'Push tokens',
    tr: 'Push tokenleri',
    ky: 'Push токендери',
    uz: 'Push tokenlari',
    de: 'Push-Tokens',
    fr: 'Jetons push',
    zh: '推送令牌列表',
  },
  displayField: 'deviceName',
  requiredPermission: 'super_admin.device_push_token:read',
  fields: {
    lastUsedAt: {
      type: 'datetime',
      label: { ru: 'Использован', en: 'Last used', tr: 'Son kullanım' },
    },
    deviceName: { type: 'string', label: { ru: 'Устройство', en: 'Device', tr: 'Cihaz' } },
    platform: { type: 'string', label: { ru: 'Платформа', en: 'Platform', tr: 'Platform' } },
    userEmail: { type: 'string', label: { ru: 'Пользователь', en: 'User', tr: 'Kullanıcı' } },
    tenantName: { type: 'string', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
    createdAt: { type: 'date', label: { ru: 'Создан', en: 'Created', tr: 'Oluşturuldu' } },
  },
  list: {
    layout: 'table',
    searchable: true,
    listOnly: true,
    columns: [
      { key: 'lastUsedAt', label: { ru: 'Использован', en: 'Last used', tr: 'Son kullanım' } },
      { key: 'platform', label: { ru: 'Платформа', en: 'Platform', tr: 'Platform' } },
      { key: 'deviceName', label: { ru: 'Устройство', en: 'Device', tr: 'Cihaz' } },
      { key: 'userEmail', label: { ru: 'Пользователь', en: 'User', tr: 'Kullanıcı' } },
      { key: 'tenantName', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
      { key: 'createdAt', label: { ru: 'Создан', en: 'Created', tr: 'Oluşturuldu' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'ios', label: { ru: 'iOS', en: 'iOS', tr: 'iOS' } },
      { key: 'android', label: { ru: 'Android', en: 'Android', tr: 'Android' } },
      { key: 'web', label: { ru: 'Web', en: 'Web', tr: 'Web' } },
    ],
  },
  source: {
    source: 'devicePushToken',
    searchFields: ['deviceName'],
    chipFilters: {
      ios: { platform: { equals: 'ios', mode: 'insensitive' } },
      android: { platform: { equals: 'android', mode: 'insensitive' } },
      web: { platform: { equals: 'web', mode: 'insensitive' } },
    },
    include: {
      tenant: { select: { id: true, name: true } },
      user: { select: { id: true, email: true } },
    },
    orderBy: { lastUsedAt: 'desc' },
    map: (t) => {
      const tenant = t.tenant as { id: string; name: string };
      const user = t.user as { id: string; email: string };
      return {
        id: t.id as string,
        lastUsedAt: t.lastUsedAt,
        platform: t.platform,
        deviceName: (t.deviceName as string | null) ?? '—',
        userEmail: user.email,
        tenantName: tenant.name,
        createdAt: t.createdAt,
      };
    },
  },
});
