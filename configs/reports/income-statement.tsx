import { formatMoney } from '@/lib/format-money';
import {
  type LocalizedLabel,
  type ReportKpiCard,
  type ReportPnlRow,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Income statement (P&L) report — period totals with prior-period compare.
 *
 * Revenue → COGS → Gross Profit → Opex → Operating Profit → Tax → Net Profit.
 *
 * Sources:
 *  - Revenue / COGS: `movement_sales_sale` (revenue + cost columns).
 *  - Opex: `movement_purchases_accounts_payable` kind='income' (collapsed to
 *    a single "Прочие расходы" leaf — no expense-category taxonomy yet).
 *  - Tax: V0 assumes 0 (no tax-rate field on the platform yet).
 *
 * Prior-period window mirrors current-period length immediately preceding it:
 *   priorStart = currentStart − (currentEnd − currentStart)
 *   priorEnd   = currentStart
 */
export const incomeStatementReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'income-statement',
    title: {
      en: 'Income Statement',
      ru: 'Отчёт о прибылях и убытках',
      tr: 'Gelir tablosu',
    },
    subtitleSecondary: {
      en: 'Income statement · P&L',
      ru: 'Отчёт о прибылях и убытках · P&L',
      tr: 'Gelir tablosu · P&L',
    },
    breadcrumb: {
      en: 'Reports / Income Statement',
      ru: 'Отчёты / Отчёт о прибылях',
      tr: 'Raporlar / Gelir tablosu',
    },
    section: {
      en: 'Statements',
      ru: 'Финансовые отчёты',
      tr: 'Finansal raporlar',
    },
    hubCard: {
      icon: 'dollar-sign',
      description: {
        en: 'Revenue, COGS, opex and margins for the period.',
        ru: 'Выручка, себестоимость, расходы и маржа за период.',
        tr: 'Dönem geliri, maliyet, gider ve kâr marjları.',
      },
    },
    topbar: { periodPicker: 'quarter', exportButton: true },
    loader: loadIncomeStatement,
  };
  defineReportView(config);
  return config;
}

function formatDelta(
  current: number,
  prior: number,
): { direction: 'up' | 'down'; formatted: string } | undefined {
  if (prior === 0 && current === 0) return undefined;
  const direction: 'up' | 'down' = current >= prior ? 'up' : 'down';
  // No prior-period basis → percentage delta is undefined (was a confusing
  // "▲ ∞"). Show no delta chip rather than a misleading infinity.
  if (prior === 0) {
    return undefined;
  }
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  const arrow = direction === 'up' ? '▲' : '▼';
  return { direction, formatted: `${arrow} ${Math.abs(pct).toFixed(1)}%` };
}

function formatMarginPct(value: number, revenue: number): string {
  if (revenue <= 0) return '0.0%';
  return `${((value / revenue) * 100).toFixed(1)}%`;
}

async function loadIncomeStatement(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;

  const curStart = period.start;
  const curEnd = period.end;
  const span = curEnd.getTime() - curStart.getTime();
  const priorStart = new Date(curStart.getTime() - span);
  const priorEnd = curStart;

  const [revCur, revPrior, opexCurAgg, opexPriorAgg] = await Promise.all([
    tx.movement_sales_sale.aggregate({
      _sum: { revenue: true, cost: true },
      where: { active: true, timestamp: { gte: curStart, lt: curEnd } },
    }),
    tx.movement_sales_sale.aggregate({
      _sum: { revenue: true, cost: true },
      where: { active: true, timestamp: { gte: priorStart, lt: priorEnd } },
    }),
    tx.movement_purchases_accounts_payable.aggregate({
      _sum: { amount: true },
      where: { active: true, kind: 'income', timestamp: { gte: curStart, lt: curEnd } },
    }),
    tx.movement_purchases_accounts_payable.aggregate({
      _sum: { amount: true },
      where: { active: true, kind: 'income', timestamp: { gte: priorStart, lt: priorEnd } },
    }),
  ]);

  const revenueCur = Number(revCur._sum.revenue ?? 0);
  const cogsCur = Number(revCur._sum.cost ?? 0);
  const revenuePrior = Number(revPrior._sum.revenue ?? 0);
  const cogsPrior = Number(revPrior._sum.cost ?? 0);
  const opexCur = Number(opexCurAgg._sum.amount ?? 0);
  const opexPrior = Number(opexPriorAgg._sum.amount ?? 0);

  const gpCur = revenueCur - cogsCur;
  const gpPrior = revenuePrior - cogsPrior;
  const opCur = gpCur - opexCur;
  const opPrior = gpPrior - opexPrior;
  const taxCur = 0;
  const taxPrior = 0;
  const netCur = opCur - taxCur;
  const netPrior = opPrior - taxPrior;

  const money = (v: number) => formatMoney(v, tenant.locale, tenant.currency);

  const rows: ReportPnlRow[] = [
    {
      id: 'rev',
      kind: 'section',
      label: { en: 'Revenue', ru: 'Выручка', tr: 'Gelir' },
      current: money(revenueCur),
      prior: money(revenuePrior),
      delta: formatDelta(revenueCur, revenuePrior),
    },
    {
      id: 'rev-sales',
      kind: 'leaf',
      label: { en: 'Sales income', ru: 'Доход от продаж', tr: 'Satış geliri' },
      current: money(revenueCur),
      prior: money(revenuePrior),
      delta: formatDelta(revenueCur, revenuePrior),
      depth: 1,
    },
    {
      id: 'cogs',
      kind: 'section',
      label: { en: 'Cost of goods sold', ru: 'Себестоимость продаж', tr: 'Satılan malın maliyeti' },
      current: money(cogsCur),
      prior: money(cogsPrior),
      delta: formatDelta(cogsCur, cogsPrior),
    },
    {
      id: 'cogs-prod',
      kind: 'leaf',
      label: { en: 'Product cost', ru: 'Себестоимость товаров', tr: 'Ürün maliyeti' },
      current: money(cogsCur),
      prior: money(cogsPrior),
      delta: formatDelta(cogsCur, cogsPrior),
      depth: 1,
    },
    {
      id: 'gp',
      kind: 'subtotal',
      label: { en: 'Gross Profit', ru: 'Валовая прибыль', tr: 'Brüt kâr' },
      current: money(gpCur),
      prior: money(gpPrior),
      delta: formatDelta(gpCur, gpPrior),
      margin: formatMarginPct(gpCur, revenueCur),
    },
    {
      id: 'opex',
      kind: 'section',
      label: { en: 'Operating expenses', ru: 'Операционные расходы', tr: 'Faaliyet giderleri' },
      current: money(opexCur),
      prior: money(opexPrior),
      delta: formatDelta(opexCur, opexPrior),
    },
    {
      id: 'opex-other',
      kind: 'leaf',
      label: { en: 'Other expenses', ru: 'Прочие расходы', tr: 'Diğer giderler' },
      current: money(opexCur),
      prior: money(opexPrior),
      delta: formatDelta(opexCur, opexPrior),
      depth: 1,
    },
    {
      id: 'op',
      kind: 'subtotal',
      label: { en: 'Operating Profit', ru: 'Операционная прибыль', tr: 'Faaliyet kârı' },
      current: money(opCur),
      prior: money(opPrior),
      delta: formatDelta(opCur, opPrior),
      margin: formatMarginPct(opCur, revenueCur),
    },
    {
      id: 'tax',
      kind: 'leaf',
      label: {
        en: 'Tax (assumed 0)',
        ru: 'Налог (принят 0)',
        tr: 'Vergi (0 varsayıldı)',
      },
      current: money(taxCur),
      prior: money(taxPrior),
      depth: 0,
    },
    {
      id: 'net',
      kind: 'total',
      label: { en: 'Net Profit', ru: 'Чистая прибыль', tr: 'Net kâr' },
      current: money(netCur),
      prior: money(netPrior),
      delta: formatDelta(netCur, netPrior),
      margin: formatMarginPct(netCur, revenueCur),
    },
  ];

  // ---------- KPIs: 3 margin cards ----------
  const grossMarginCur = revenueCur > 0 ? (gpCur / revenueCur) * 100 : 0;
  const grossMarginPrior = revenuePrior > 0 ? (gpPrior / revenuePrior) * 100 : 0;
  const operatingMarginCur = revenueCur > 0 ? (opCur / revenueCur) * 100 : 0;
  const operatingMarginPrior = revenuePrior > 0 ? (opPrior / revenuePrior) * 100 : 0;
  const netMarginCur = revenueCur > 0 ? (netCur / revenueCur) * 100 : 0;
  const netMarginPrior = revenuePrior > 0 ? (netPrior / revenuePrior) * 100 : 0;

  function marginDelta(
    cur: number,
    prior: number,
  ): { direction: 'up' | 'down'; formatted: string; note: LocalizedLabel } {
    const direction: 'up' | 'down' = cur >= prior ? 'up' : 'down';
    const arrow = direction === 'up' ? '▲' : '▼';
    const diff = Math.abs(cur - prior);
    return {
      direction,
      formatted: `${arrow} ${diff.toFixed(1)} pts`,
      note: { en: 'vs prior period', ru: 'к пред. периоду', tr: 'önceki döneme göre' },
    };
  }

  const kpis: ReportKpiCard[] = [
    {
      id: 'grossMarginPct',
      label: { en: 'Gross margin', ru: 'Валовая маржа', tr: 'Brüt marj' },
      value: `${grossMarginCur.toFixed(1)}%`,
      delta: marginDelta(grossMarginCur, grossMarginPrior),
      tone: grossMarginCur >= grossMarginPrior ? 'positive' : 'negative',
    },
    {
      id: 'operatingMarginPct',
      label: { en: 'Operating margin', ru: 'Операционная маржа', tr: 'Faaliyet marjı' },
      value: `${operatingMarginCur.toFixed(1)}%`,
      delta: marginDelta(operatingMarginCur, operatingMarginPrior),
      tone: operatingMarginCur >= operatingMarginPrior ? 'positive' : 'negative',
    },
    {
      id: 'netMarginPct',
      label: { en: 'Net margin', ru: 'Чистая маржа', tr: 'Net marj' },
      value: `${netMarginCur.toFixed(1)}%`,
      delta: marginDelta(netMarginCur, netMarginPrior),
      tone: netMarginCur >= netMarginPrior ? 'positive' : 'negative',
    },
  ];

  return {
    kpis,
    sections: [{ kind: 'pnl', rows }],
  };
}
