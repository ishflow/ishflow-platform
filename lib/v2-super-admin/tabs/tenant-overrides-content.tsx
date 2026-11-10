import { SaFeatureKillList } from '@/components/v2/super-admin/tenants/sa-feature-kill-list';
import { SaPriceOverride } from '@/components/v2/super-admin/tenants/sa-price-override';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantOverrides } from '@/lib/v2-super-admin/load-tenant-overrides';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function renderTenantOverridesTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, data] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.overrides'),
    loadSaTenantOverrides(id),
  ]);

  const featureKillI18n = {
    sectionTitle: t('featureKill.title'),
    sectionSubtitle: t('featureKill.subtitle'),
    keyPlaceholder: t('featureKill.keyPlaceholder'),
    reasonPlaceholder: t('featureKill.reasonPlaceholder'),
    addButton: t('featureKill.addButton'),
    adding: t('featureKill.adding'),
    empty: t('featureKill.empty'),
    removeAria: t('featureKill.removeAria'),
  };

  const priceI18n = {
    sectionTitle: t('price.title'),
    sectionSubtitle: t('price.subtitle'),
    priceLabel: t('price.priceLabel'),
    pricePlaceholder: t('price.pricePlaceholder'),
    reasonLabel: t('price.reasonLabel'),
    reasonPlaceholder: t('price.reasonPlaceholder'),
    effectiveUntilLabel: t('price.effectiveUntilLabel'),
    saveButton: t('price.saveButton'),
    saving: t('price.saving'),
    removeButton: t('price.removeButton'),
    removing: t('price.removing'),
    empty: t('price.empty'),
  };

  const kills = data.featureKills.map((k) => ({
    featureKey: k.featureKey,
    reason: k.reason,
    metaLine: t('featureKill.metaLine', {
      by: k.killedByName ?? '—',
      date: formatDate(k.killedAt),
    }),
  }));

  const priceCurrent = data.priceOverride
    ? {
        monthlyPriceUsd: data.priceOverride.monthlyPriceUsd,
        reason: data.priceOverride.reason,
        effectiveUntil: data.priceOverride.effectiveUntil
          ? formatDate(data.priceOverride.effectiveUntil)
          : null,
        metaLine: t('price.metaLine', {
          by: data.priceOverride.createdByName ?? '—',
          date: formatDate(data.priceOverride.effectiveFrom),
        }),
      }
    : null;

  return (
    <>
      <SaTenantSection
        title={featureKillI18n.sectionTitle}
        subtitle={featureKillI18n.sectionSubtitle}
      >
        <SaFeatureKillList tenantId={id} kills={kills} i18n={featureKillI18n} />
      </SaTenantSection>

      <SaTenantSection title={priceI18n.sectionTitle} subtitle={priceI18n.sectionSubtitle}>
        <SaPriceOverride tenantId={id} current={priceCurrent} i18n={priceI18n} />
      </SaTenantSection>
    </>
  );
}
