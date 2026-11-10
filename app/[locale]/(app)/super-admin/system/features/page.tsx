import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { type FeatureEntry, collectFeatures } from '@/lib/v2-shell/feature-catalog';
import { loadEnabledFeatures } from '@/platform/features/load-enabled-features';
import { getTranslations } from 'next-intl/server';
import { saveFeatureFlagsAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Super-admin "Features" page — global on/off switches for hideable features,
 * grouped by module (rail). Checked = visible. Submitting writes the
 * feature_flag table and revalidates the layout so the nav updates. A feature
 * absent from the table is OFF by default; the seed turns the current surface
 * on. See the internal design spec.
 */
export default async function SaFeaturesPage() {
  const t = await getTranslations('v2_super_admin.features');
  const tNav = await getTranslations('v2_nav');
  const features = collectFeatures();
  const enabled = await loadEnabledFeatures();

  const groups = new Map<string, FeatureEntry[]>();
  for (const f of features) {
    const arr = groups.get(f.railKey) ?? [];
    arr.push(f);
    groups.set(f.railKey, arr);
  }

  return (
    <SaCmsPageShell
      topbar={<SaTopbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />}
    >
      <form action={saveFeatureFlagsAction} className="flex flex-col gap-4 p-4">
        {features.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
        ) : (
          [...groups.entries()].map(([railKey, items]) => (
            <section key={railKey} className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 font-medium text-foreground text-sm">
                {tNav(`rail.${railKey}`)}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((f) => (
                  <label key={f.key} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="enabled"
                      value={f.key}
                      defaultChecked={enabled.has(f.key)}
                      className="size-4 accent-primary"
                    />
                    <span className="text-foreground">{tNav(f.i18nKey)}</span>
                    <code className="text-muted-foreground text-xs">{f.key}</code>
                  </label>
                ))}
              </div>
            </section>
          ))
        )}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary btn-sm">
            {t('save')}
          </button>
          <span className="text-muted-foreground text-xs">{t('hint')}</span>
        </div>
      </form>
    </SaCmsPageShell>
  );
}
