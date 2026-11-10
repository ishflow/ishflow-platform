import { V2ChipFilterLink } from '@/components/v2/data/chip-filter-link';
import { type DataKpiItem, V2DataKpiStrip } from '@/components/v2/data/data-kpi';
import { V2ExportCsvButton } from '@/components/v2/data/export-csv-button';
import { V2RegisterPeriodPicker } from '@/components/v2/data/register-period-picker';
import { V2RegisterSearchInput } from '@/components/v2/data/register-search-input';
import { type RegisterRow, V2RegisterTable } from '@/components/v2/data/register-table';
import { V2SaveViewButton } from '@/components/v2/data/save-view-button';
import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { parsePage } from '@/lib/list/pagination';
import { parseRegisterPeriod } from '@/lib/v2-shell/parse-register-period';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getPeriodClose } from '@/platform/engine/period-close';
import { getSavedView, getViewPreference } from '@/platform/engine/saved-views';
import {
  type Locale,
  type PeriodSelection,
  type RegisterViewConfig,
  getRegisterViewRegistry,
} from '@/platform/metadata';
import { mapKpi, pickLabel } from '@/platform/metadata/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { V2InlineColumnBar } from './inline-column-bar';
import { V2RegisterMatrix } from './register-matrix';

/**
 * Generic V2 register-view shell. Drives every `/registers/<id>`
 * page from the metadata registry.
 *
 * Pages call this with `{ id, searchParams }` (searchParams resolved
 * from the Next.js 16 promise). Behaviour:
 *
 * 1. Look up config; render not-found block if missing.
 * 2. Resolve tenant; render empty payload if unauthenticated.
 * 3. Parse `?period=` / `?chip=` / `?q=` from search params.
 * 4. Run loader under `withTenant`.
 * 5. Map RegisterViewKpi → DataKpiItem and compose Topbar + KPI strip
 *    + chip filter + URL-driven search + register table.
 */
export async function renderV2RegisterView({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { views } = getRegisterViewRegistry();
  const config = views.get(id);
  const t = await getTranslations('v2_data.registers');
  const c = await getTranslations('v2_data.common');
  const locale = (await getLocale()) as Locale;

  if (!config) {
    return (
      <>
        <V2Topbar
          breadcrumb={t('notFound.breadcrumb')}
          title={t('notFound.title')}
          subtitle={t('notFound.subtitle', { id })}
        />
        <div className="content" />
      </>
    );
  }

  let tenantId = '';
  let userId = '';
  let currency = 'USD';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    userId = ctx.user?.id ?? '';
    currency = ctx.tenant?.currency ?? 'USD';
  } catch {
    /* unauthenticated — render empty */
  }

  // ?view= hydration — when present, the saved view's stored payload
  // (URL-encoded snapshot of period/chip/q) overrides whatever's in the
  // current URL. If the view isn't found (deleted, wrong tenant), fall
  // back silently to the URL params.
  const savedViewId = stringParam(searchParams.view);
  let effectiveParams: Record<string, string | string[] | undefined> = searchParams;
  if (savedViewId && tenantId && userId) {
    const saved = await withTenant(tenantId, (tx) =>
      getSavedView(tx, tenantId, userId, savedViewId),
    ).catch(() => null);
    if (saved?.payload && typeof saved.payload === 'object') {
      effectiveParams = { ...searchParams, ...(saved.payload as Record<string, string>) };
    }
  }

  const period = parseRegisterPeriod(stringParam(effectiveParams.period) ?? undefined, new Date());
  const chip = stringParam(effectiveParams.chip);
  const search = stringParam(effectiveParams.q);
  const page = parsePage(stringParam(effectiveParams.page) ?? undefined);
  const REGISTER_PAGE_SIZE = 25;

  // Period-close awareness — the picker greys out months up to and
  // including `closedThroughMonth`, and shows a badge on the capsule
  // when the selected period overlaps a closed period. Read-only data;
  // no posting blocks here (registers are derived from movements).
  let closedThroughMonth: string | null = null;
  if (tenantId) {
    try {
      const rows = await withTenant(tenantId, (tx) => getPeriodClose(tx, tenantId));
      // Latest closed-through across all modules (or wildcard).
      let maxIso: string | null = null;
      for (const row of rows) {
        const y = row.closedThrough.getUTCFullYear();
        const m = String(row.closedThrough.getUTCMonth() + 1).padStart(2, '0');
        const iso = `${y}-${m}`;
        if (!maxIso || iso > maxIso) maxIso = iso;
      }
      closedThroughMonth = maxIso;
    } catch {
      /* fall back to no badge */
    }
  }
  const periodIso = (() => {
    if (period.kind === 'month') {
      return `${period.year}-${String(period.month).padStart(2, '0')}`;
    }
    if (period.kind === 'day') {
      const y = period.date.getUTCFullYear();
      const m = String(period.date.getUTCMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
    const y = period.start.getUTCFullYear();
    const m = String(period.start.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  })();
  const isCurrentPeriodClosed = closedThroughMonth ? periodIso <= closedThroughMonth : false;

  let payload = emptyPayload();
  if (tenantId) {
    payload = await withTenant(tenantId, async (tx) => {
      return config.loader({
        tenant: { id: tenantId, locale, currency },
        tx,
        period,
        chip,
        search,
        page,
      });
    });
  }

  const subtitle = `${pickLabel(config.subtitleSecondary, locale)} · ${pickLabel(
    config.countLabel(payload.subtitleCount),
    locale,
  )}`;

  const kpiItems: DataKpiItem[] = payload.kpis.map((k) => mapKpi(k, locale));

  const chipOptions = payload.chips.map((c) => ({
    key: c.key,
    label: pickLabel(c.label, locale),
    count: c.count ?? undefined,
  }));

  const tableRows: RegisterRow[] = payload.rows;

  const columns = config.columns.map((col) => ({
    key: col.key,
    label: pickLabel(col.label, locale),
    align: col.align,
  }));

  const searchPlaceholder =
    config.search === false ? '' : pickLabel(config.search.placeholder, locale);

  const actions =
    config.topbar.periodPicker !== false ? (
      <>
        <V2RegisterPeriodPicker
          label={formatPeriodLabel(period, locale)}
          monthShortNames={getMonthShortNames(locale)}
          presets={{
            today: t('periodPicker.preset.today'),
            thisWeek: t('periodPicker.preset.thisWeek'),
            thisMonth: t('periodPicker.preset.thisMonth'),
            thisYear: t('periodPicker.preset.thisYear'),
          }}
          customRangeLabel={t('periodPicker.customRange')}
          applyLabel={t('periodPicker.apply')}
          closedThroughMonth={closedThroughMonth}
          closedBadge={isCurrentPeriodClosed ? t('periodPicker.closedBadge') : null}
          initialYear={
            period.kind === 'range'
              ? period.start.getUTCFullYear()
              : period.kind === 'day'
                ? period.date.getUTCFullYear()
                : period.year
          }
        />
        {config.topbar.exportButton ? (
          <V2ExportCsvButton label={c('export')} filenameStem={`register-${id}`} />
        ) : null}
      </>
    ) : null;

  // Matrix-mode path — loader returned a matrix payload.
  if (payload.matrix) {
    // Resolve visible columns:
    // 1. URL ?cols= (explicit user choice, shareable)
    // 2. DB preference (sticky across sessions)
    // 3. Default visible (config-level fallback)
    const urlCols = stringParam(effectiveParams.cols);
    let visibleCodes: string[] | null = urlCols
      ? urlCols
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    if (!visibleCodes && tenantId && userId) {
      try {
        const pref = await withTenant(tenantId, (tx) =>
          getViewPreference(tx, tenantId, userId, config.id),
        );
        const payloadObj = pref?.payload as { cols?: unknown } | null;
        if (payloadObj?.cols && Array.isArray(payloadObj.cols)) {
          visibleCodes = (payloadObj.cols as string[]).filter((s) => typeof s === 'string');
        }
      } catch {
        /* fall through to defaultVisible */
      }
    }
    if (!visibleCodes) {
      visibleCodes = payload.matrix.columns.filter((c) => c.defaultVisible).map((c) => c.code);
    }

    const pickerColumns = payload.matrix.columns.map((col) => ({
      code: col.code,
      title: col.title,
      subtitle: col.subtitle,
      locked: col.locked,
    }));

    return (
      <>
        <V2Topbar
          breadcrumb={pickLabel(config.breadcrumb, locale)}
          title={pickLabel(config.title, locale)}
          subtitle={subtitle}
          actions={actions}
        />
        <div className="content">
          <V2DataKpiStrip items={kpiItems} />
          <V2RegisterMatrix
            payload={payload.matrix}
            visibleCodes={visibleCodes}
            toolbarLeft={<strong style={{ fontSize: 14 }}>{t('matrix.title')}</strong>}
            toolbarRight={null}
            columnBar={
              <V2InlineColumnBar
                viewId={config.id}
                columns={pickerColumns}
                visibleCodes={visibleCodes}
                i18n={{
                  label: t('columnBar.label'),
                  showAll: t('columnBar.showAll'),
                  onlyLocked: t('columnBar.onlyLocked'),
                  lockedHint: t('columnBar.lockedHint'),
                }}
              />
            }
            footer={
              payload.matrix.rows.length > 0
                ? t('matrix.footer', {
                    rows: payload.matrix.rows.length,
                    cols: visibleCodes.length,
                  })
                : undefined
            }
            i18n={{
              productColumnLabel: t('matrix.productColumn'),
              emptyTitle: t('matrix.emptyTitle'),
              emptySubtitle: t('matrix.emptySubtitle'),
            }}
          />
          {tableRows.length > 0 ? (
            <>
              <div
                style={{
                  marginTop: 18,
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                }}
              >
                {t('entries.sectionTitle')}
              </div>
              <V2RegisterTable
                chipOptions={[]}
                chipFilterNode={undefined}
                searchInputNode={undefined}
                saveViewSlot={undefined}
                searchPlaceholder=""
                filterLabel={c('filter')}
                exportLabel={c('export')}
                columns={columns}
                rows={tableRows}
                totalsRow={payload.totalsRow}
                pagerInfo={
                  payload.totalCount > 0
                    ? c('pagerInfo', {
                        from: 1,
                        to: tableRows.length,
                        total: payload.totalCount,
                        perPage: 25,
                      })
                    : undefined
                }
                pageCount={Math.ceil(payload.totalCount / 25)}
              />
            </>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      <V2Topbar
        breadcrumb={pickLabel(config.breadcrumb, locale)}
        title={pickLabel(config.title, locale)}
        subtitle={subtitle}
        actions={actions}
      />
      <div className="content">
        <V2DataKpiStrip items={kpiItems} />
        <V2RegisterTable
          chipOptions={[]}
          chipFilterNode={<V2ChipFilterLink options={chipOptions} />}
          searchInputNode={
            config.search === false ? undefined : (
              <V2RegisterSearchInput placeholder={searchPlaceholder} />
            )
          }
          saveViewSlot={
            <V2SaveViewButton
              kind={`register:${config.id}`}
              label={t('saveView.label')}
              namePrompt={t('saveView.namePrompt')}
              errorMessage={t('saveView.error')}
            />
          }
          searchPlaceholder={searchPlaceholder}
          filterLabel={c('filter')}
          exportLabel={c('export')}
          columns={columns}
          rows={tableRows}
          totalsRow={payload.totalsRow}
          emptyState={payload.emptyState}
          pagerInfo={
            config.paginated || payload.totalCount === 0
              ? undefined
              : c('pagerInfo', {
                  from: 1,
                  to: tableRows.length,
                  total: payload.totalCount,
                  perPage: 25,
                })
          }
          pageCount={config.paginated ? undefined : Math.ceil(payload.totalCount / 25)}
        />
        {config.paginated && payload.totalCount > 0 ? (
          <V2ListPager total={payload.totalCount} page={page} pageSize={REGISTER_PAGE_SIZE} />
        ) : null}
      </div>
    </>
  );
}

function emptyPayload(): Awaited<ReturnType<RegisterViewConfig['loader']>> {
  return {
    kpis: [],
    chips: [],
    rows: [],
    totalCount: 0,
    subtitleCount: 0,
  };
}

function stringParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function formatPeriodLabel(p: PeriodSelection, locale: Locale): string {
  if (p.kind === 'month') {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(p.start);
  }
  if (p.kind === 'day') {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(p.date);
  }
  // Whole-month ranges show "May – Jul 2026"; day-level custom ranges show
  // the day too ("16 May – 20 Jul 2026").
  const monthAligned = p.start.getUTCDate() === 1 && p.end.getUTCDate() === 1;
  const fmt = new Intl.DateTimeFormat(locale, {
    day: monthAligned ? undefined : 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${fmt.format(p.start)} – ${fmt.format(new Date(p.end.getTime() - 86_400_000))}`;
}

function getMonthShortNames(locale: Locale): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const out: string[] = [];
  for (let m = 0; m < 12; m++) {
    out.push(fmt.format(new Date(Date.UTC(2026, m, 1))));
  }
  return out;
}
