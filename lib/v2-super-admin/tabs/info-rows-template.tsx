import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import type { Locale, SuperAdminCatalogTabRender } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export type InfoRowSpec<T> = {
  /** i18n key relative to `i18nNamespace`. */
  labelKey: string;
  /** Direct string/number selector — wrapped in a plain text span. */
  value?: (data: T) => string | number | null | undefined;
  /**
   * Pill cell: returns a translation key + className. Engine renders
   * <span class={cls}>{t(textKey)}</span>. Use for status/badge cells.
   */
  pill?: (data: T) => { textKey: string; cls: string } | null;
  /** Escape hatch — full ReactNode renderer for irregular cells. */
  node?: (data: T) => ReactNode;
  /** Render this row only when predicate returns true. */
  showIf?: (data: T) => boolean;
  /** Monospace value rendering. */
  mono?: boolean;
};

export type InfoSectionSpec<T> = {
  titleKey: string;
  subtitleKey?: string;
  /**
   * When `subtitleKey` uses ICU placeholders, this returns the param map.
   * Skip when the subtitle has no params.
   */
  subtitleParams?: (data: T) => Record<string, string | number>;
  rows: Array<InfoRowSpec<T>>;
};

export type InfoRowsTabSpec<T> = {
  /** i18n namespace whose keys the `labelKey` / `titleKey` refer to. */
  i18nNamespace: string;
  /** Cached server loader — returning null fires Next.js notFound. */
  loader: (params: { id: string; locale: Locale }) => Promise<T | null>;
  sections: Array<InfoSectionSpec<T>>;
};

/**
 * Declarative builder for info-rows-style detail tabs. Returns a render fn
 * compatible with SuperAdminCatalogTabRender — drop straight into
 * `defineSuperAdminCatalogTab({ render: buildInfoRowsTab({...}) })`.
 *
 * Covers the 60-80% of read-only detail tabs that boil down to "fetch a
 * record, lay it out as labelled key/value rows in N sections." For tabs
 * with interactive controls, lists, or custom layouts, write a custom
 * render function instead.
 */
export function buildInfoRowsTab<T>(spec: InfoRowsTabSpec<T>): SuperAdminCatalogTabRender {
  return async ({ id, locale }) => {
    const [t, data] = await Promise.all([
      getTranslations(spec.i18nNamespace),
      spec.loader({ id, locale }),
    ]);
    if (!data) notFound();

    return (
      <>
        {spec.sections.map((section, sectionIdx) => {
          const subtitle = section.subtitleKey
            ? section.subtitleParams
              ? t(section.subtitleKey, section.subtitleParams(data))
              : t(section.subtitleKey)
            : undefined;
          return (
            <div key={section.titleKey}>
              {sectionIdx > 0 ? <div className="spacer" /> : null}
              <SaTenantSection title={t(section.titleKey)} subtitle={subtitle}>
                {section.rows
                  .filter((row) => (row.showIf ? row.showIf(data) : true))
                  .map((row) => {
                    let valueNode: ReactNode;
                    if (row.node) {
                      valueNode = row.node(data);
                    } else if (row.pill) {
                      const pill = row.pill(data);
                      valueNode = pill ? <span className={pill.cls}>{t(pill.textKey)}</span> : '—';
                    } else if (row.value) {
                      const v = row.value(data);
                      valueNode = v == null || v === '' ? '—' : String(v);
                    } else {
                      valueNode = '—';
                    }
                    return (
                      <SaTenantInfoRow
                        key={row.labelKey}
                        k={t(row.labelKey)}
                        v={valueNode}
                        mono={row.mono}
                      />
                    );
                  })}
              </SaTenantSection>
            </div>
          );
        })}
      </>
    );
  };
}
