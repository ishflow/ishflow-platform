import '@/configs';
import { V2ChipFilterLink } from '@/components/v2/data/chip-filter-link';
import { type DataKpiItem, V2DataKpiStrip } from '@/components/v2/data/data-kpi';
import { V2ExportCsvButton } from '@/components/v2/data/export-csv-button';
import { V2RegisterPeriodPicker } from '@/components/v2/data/register-period-picker';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { parseRegisterPeriod } from '@/lib/v2-shell/parse-register-period';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getPeriodClose } from '@/platform/engine/period-close';
import { hasPermission } from '@/platform/engine/permissions';
import { notFound } from 'next/navigation';

/**
 * Report id → the report bucket(s) that may view it. owner/admin additionally
 * hold the blanket `reports:read`. Reports run custom `config.loader` queries
 * that bypass the engine's per-entity permission check, so this route gate is
 * the real enforcement (the nav already hides what a role can't see).
 */
const REPORT_BUCKETS: Record<string, string[]> = {
  'gross-profit': ['reports.financial:read'],
  'income-statement': ['reports.financial:read'],
  aging: ['reports.financial:read'],
  'cash-book': ['reports.financial:read', 'reports.payments:read'],
  'cash-flow': ['reports.financial:read', 'reports.payments:read'],
  'counterparty-card': ['reports.sales:read', 'reports.purchases:read'],
  'top-customers': ['reports.sales:read'],
  'product-card': ['reports.inventory:read'],
  'inventory-valuation': ['reports.inventory:read'],
  'slow-stock': ['reports.inventory:read'],
  'turnover-sales': ['reports.sales:read', 'reports.financial:read'],
  'turnover-receivable': ['reports.financial:read'],
  'turnover-payable': ['reports.purchases:read', 'reports.financial:read'],
  'turnover-stock': ['reports.inventory:read'],
};
import {
  type Locale,
  type PeriodSelection,
  type ReportSection,
  type ReportViewPayload,
  getReportRegistry,
} from '@/platform/metadata';
import { mapKpi, pickLabel } from '@/platform/metadata/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { SectionAging } from './sections/section-aging';
import { SectionBreakdown } from './sections/section-breakdown';
import { SectionChart } from './sections/section-chart';
import { SectionPnl } from './sections/section-pnl';
import { SectionRanked } from './sections/section-ranked';

/**
 * Generic V2 report-view shell — mirror of `render-register-view.tsx`.
 *
 * Drives every `/reports/<id>` page from the metadata registry.
 *
 * Pages call this with `{ id, searchParams }` (resolved). Behavior:
 *
 * 1. Look up config; render not-found block if missing.
 * 2. Resolve tenant; render empty payload if unauthenticated.
 * 3. Parse `?period=` / `?chip=` / `?q=` from URL.
 * 4. Run loader under `withTenant`.
 * 5. Render: Topbar + KPI strip + optional chip row + ordered sections.
 */
export async function renderV2ReportView({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { views } = getReportRegistry();
  const config = views.get(id);
  const t = await getTranslations('v2_data.reports.shell');
  const tReg = await getTranslations('v2_data.registers');
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
  let currency = 'USD';
  let perms = new Set<string>();
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    currency = ctx.tenant?.currency ?? 'USD';
    perms = ctx.permissions;
  } catch {
    /* unauthenticated — render empty */
  }

  // Permission gate (defense-in-depth — the nav hides reports a role can't
  // see; this blocks a direct URL hit). Only enforced once we have a tenant
  // context, so the unauthenticated path still renders the empty shell.
  const buckets = REPORT_BUCKETS[id] ?? [];
  if (tenantId && !perms.has('reports:read') && !buckets.some((b) => hasPermission(perms, b))) {
    notFound();
  }

  const period = parseRegisterPeriod(stringParam(searchParams.period) ?? undefined, new Date());
  const chip = stringParam(searchParams.chip);
  const search = stringParam(searchParams.q);

  // Period-close awareness — read-only badge in topbar (reports are derived).
  let closedThroughMonth: string | null = null;
  if (tenantId) {
    try {
      const rows = await withTenant(tenantId, (tx) => getPeriodClose(tx, tenantId));
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

  let payload: ReportViewPayload = { kpis: [], sections: [] };
  if (tenantId) {
    payload = await withTenant(tenantId, async (tx) => {
      return config.loader({
        tenant: { id: tenantId, locale, currency },
        tx,
        period,
        chip,
        search,
      });
    });
  }

  const subtitle = pickLabel(config.subtitleSecondary, locale);

  const kpiItems: DataKpiItem[] = payload.kpis.map((k) => mapKpi(k, locale));

  const chipOptions = (payload.chips ?? []).map((co) => ({
    key: co.key,
    label: pickLabel(co.label, locale),
    count: co.count,
  }));

  const actions =
    config.topbar.periodPicker !== false ? (
      <>
        <V2RegisterPeriodPicker
          label={formatPeriodLabel(period, locale)}
          monthShortNames={getMonthShortNames(locale)}
          presets={{
            today: tReg('periodPicker.preset.today'),
            thisWeek: tReg('periodPicker.preset.thisWeek'),
            thisMonth: tReg('periodPicker.preset.thisMonth'),
            thisYear: tReg('periodPicker.preset.thisYear'),
          }}
          customRangeLabel={tReg('periodPicker.customRange')}
          applyLabel={tReg('periodPicker.apply')}
          closedThroughMonth={closedThroughMonth}
          closedBadge={isCurrentPeriodClosed ? tReg('periodPicker.closedBadge') : null}
          initialYear={
            period.kind === 'range'
              ? period.start.getUTCFullYear()
              : period.kind === 'day'
                ? period.date.getUTCFullYear()
                : period.year
          }
        />
        {config.topbar.exportButton ? (
          <V2ExportCsvButton label={c('export')} filenameStem={`report-${id}`} />
        ) : null}
      </>
    ) : null;

  return (
    <>
      <V2Topbar
        breadcrumb={pickLabel(config.breadcrumb, locale)}
        title={pickLabel(config.title, locale)}
        subtitle={subtitle}
        actions={actions}
      />
      <div className="content">
        {kpiItems.length > 0 ? <V2DataKpiStrip items={kpiItems} /> : null}
        {chipOptions.length > 0 ? <V2ChipFilterLink options={chipOptions} /> : null}
        {payload.sections.map((section, i) => renderSection(section, i, locale, t))}
      </div>
    </>
  );
}

function renderSection(
  section: ReportSection,
  i: number,
  locale: Locale,
  t: Awaited<ReturnType<typeof getTranslations<'v2_data.reports.shell'>>>,
) {
  const key = `s-${i}`;
  if (section.kind === 'breakdown') {
    return (
      <SectionBreakdown
        key={key}
        section={section}
        locale={locale}
        fallbackTitle={t('breakdown.title')}
        moreLabel={t('breakdown.showMore')}
      />
    );
  }
  if (section.kind === 'ranked') {
    return (
      <SectionRanked
        key={key}
        section={section}
        locale={locale}
        fallbackTitle={t('ranked.title')}
      />
    );
  }
  if (section.kind === 'aging') {
    return <SectionAging key={key} section={section} locale={locale} />;
  }
  if (section.kind === 'chart') {
    return (
      <SectionChart
        key={key}
        section={section}
        title={t('chart.title')}
        periodLabel={t('chart.periodLabel')}
      />
    );
  }
  if (section.kind === 'pnl') {
    return (
      <SectionPnl
        key={key}
        section={section}
        locale={locale}
        columnLabels={{
          item: t('pnl.col.item'),
          current: t('pnl.col.current'),
          previous: t('pnl.col.previous'),
          delta: t('pnl.col.delta'),
        }}
      />
    );
  }
  return null;
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
