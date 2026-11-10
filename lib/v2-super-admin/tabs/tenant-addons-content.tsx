import { SaAddonRow } from '@/components/v2/super-admin/tenants/sa-addon-row';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantAddons } from '@/lib/v2-super-admin/load-tenant-addons';
import { getAddonLabels } from '@/platform/addons';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function renderTenantAddonsTab({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, rows] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.addons'),
    loadSaTenantAddons(id),
  ]);

  const i18n = {
    enable: t('enable'),
    disable: t('disable'),
    enabling: t('enabling'),
    confirmDescription: t('confirmDescription'),
    cancel: t('cancel'),
    confirmDisable: t('confirmDisable'),
    statusGa: t('statusGa'),
    statusBeta: t('statusBeta'),
    statusPlanned: t('statusPlanned'),
    stateActive: t('stateActive'),
    stateAvailable: t('stateAvailable'),
  };

  return (
    <SaTenantSection title={t('title')} subtitle={t('subtitle')}>
      {rows.map((r) => {
        const labels = getAddonLabels(r.key, locale);
        const enabledMetaLine =
          r.enabled && r.enabledAt
            ? t('enabledByLine', {
                by: r.enabledByName ?? '—',
                date: r.enabledAt.toISOString().slice(0, 10),
              })
            : null;
        return (
          <SaAddonRow
            key={r.key}
            tenantId={id}
            addonKey={r.key}
            title={labels.title}
            description={labels.description}
            status={r.status}
            enabled={r.enabled}
            confirmTitle={t('confirmTitle', { name: labels.title })}
            enabledMetaLine={enabledMetaLine}
            i18n={i18n}
          />
        );
      })}
    </SaTenantSection>
  );
}
