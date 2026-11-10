import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import type { Locale, SuperAdminCatalogTabRender } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export type ListTabSpec<T> = {
  /** i18n namespace whose keys the section labels refer to. */
  i18nNamespace: string;
  /** Server loader returning the rows for this list tab. */
  loader: (params: { id: string; locale: Locale }) => Promise<T[]>;
  /** Section title key. */
  titleKey: string;
  subtitleKey?: string;
  subtitleParams?: (rows: T[]) => Record<string, string | number>;
  /**
   * Empty-state label key. When absent, the engine falls back to a
   * literal '—'. Empty rows always render via SaTenantInfoRow so the
   * section panel keeps its visual structure.
   */
  emptyKey?: string;
  /**
   * Stable React key per row — usually `r.id` or `r.module + '-' + r.id`.
   */
  rowKey: (row: T) => string;
  /**
   * Left column (timestamp / date / period label).
   */
  formatLeading: (row: T) => string;
  /**
   * Right column body — full ReactNode renderer for the row.
   */
  renderRow: (row: T) => ReactNode;
  /** Render the value cell in monospace. */
  mono?: boolean;
};

/**
 * Declarative builder for list-style detail tabs (activity / timeline /
 * documents / audit / etc.). Returns a SuperAdminCatalogTabRender drop-in
 * for defineSuperAdminCatalogTab.
 *
 * Distinct from `buildInfoRowsTab` which handles key/value PROFILE-style
 * cards. This template handles "fetch N rows, render each as a SaTenantInfoRow
 * with a leading timestamp + a rich value cell." Empty state preserves the
 * section frame.
 */
export function buildListTab<T>(spec: ListTabSpec<T>): SuperAdminCatalogTabRender {
  return async ({ id, locale }) => {
    const [t, rows] = await Promise.all([
      getTranslations(spec.i18nNamespace),
      spec.loader({ id, locale }),
    ]);

    const subtitle = spec.subtitleKey
      ? spec.subtitleParams
        ? t(spec.subtitleKey, spec.subtitleParams(rows))
        : t(spec.subtitleKey)
      : undefined;
    const emptyLabel = spec.emptyKey ? (t.has(spec.emptyKey) ? t(spec.emptyKey) : '—') : '—';

    return (
      <SaTenantSection title={t(spec.titleKey)} subtitle={subtitle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.length === 0 ? (
            <SaTenantInfoRow
              k="—"
              v={<span style={{ color: 'var(--text-muted)' }}>{emptyLabel}</span>}
            />
          ) : (
            rows.map((row) => (
              <SaTenantInfoRow
                key={spec.rowKey(row)}
                k={spec.formatLeading(row)}
                v={spec.renderRow(row)}
                mono={spec.mono}
              />
            ))
          )}
        </div>
      </SaTenantSection>
    );
  };
}
