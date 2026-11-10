import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportChartSection,
  type ReportKpiCard,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Cash flow forecast — 13-week running balance derived from open A/R
 * (income = charge, expense = collection) and A/P (income = new debt,
 * expense = payment). Inflow = A/R net new this week. Outflow = A/P
 * net new this week. Net = inflow − outflow. Balance cumulates Net.
 */
export const cashFlowReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'cash-flow',
    title: {
      en: 'Cash flow forecast',
      ru: 'Прогноз движения денег',
      tr: 'Nakit akış tahmini',
    },
    subtitleSecondary: {
      en: 'Cash flow forecast · 13 weeks',
      ru: 'Прогноз движения денег · 13 недель',
      tr: 'Nakit akışı tahmini · 13 hafta',
    },
    breadcrumb: {
      en: 'Reports / Cash flow',
      ru: 'Отчёты / Движение денег',
      tr: 'Raporlar / Nakit akışı',
    },
    section: {
      en: 'Statements',
      ru: 'Финансовые отчёты',
      tr: 'Finansal raporlar',
    },
    hubCard: {
      icon: 'dollar-sign',
      description: {
        en: '13-week forecast: receivables in, payables out, running balance.',
        ru: 'Прогноз на 13 недель: поступления, выплаты, остаток.',
        tr: '13 haftalık tahmin: tahsilat, ödeme, bakiye.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadCashFlow,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

const WEEKS = 13;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function getMondayUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0..6, 0=Sun
  // ISO Monday: shift back (day===0 → -6, else → 1-day)
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday;
}

function formatRange(start: Date, end: Date, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  // end is exclusive — show the last included day
  const lastDay = new Date(end.getTime() - DAY_MS);
  return `${fmt.format(start)} – ${fmt.format(lastDay)}`;
}

async function loadCashFlow(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx } = ctx;

  const weekStart0 = getMondayUTC(new Date());
  const horizonEnd = new Date(weekStart0.getTime() + WEEKS * WEEK_MS);

  const [arMovements, apMovements] = await Promise.all([
    tx.movement_sales_accounts_receivable.findMany({
      where: { active: true, timestamp: { gte: weekStart0, lt: horizonEnd } },
      select: { kind: true, amount: true, timestamp: true },
    }),
    tx.movement_purchases_accounts_payable.findMany({
      where: { active: true, timestamp: { gte: weekStart0, lt: horizonEnd } },
      select: { kind: true, amount: true, timestamp: true },
    }),
  ]);

  type WeekBucket = {
    arIncome: number; // A/R charge — new receivable opened
    arExpense: number; // A/R payment — receivable collected
    apIncome: number; // A/P charge — new payable opened
    apExpense: number; // A/P payment — payable settled
  };
  const buckets: WeekBucket[] = Array.from({ length: WEEKS }, () => ({
    arIncome: 0,
    arExpense: 0,
    apIncome: 0,
    apExpense: 0,
  }));

  const bucketIndex = (ts: Date): number => {
    const idx = Math.floor((ts.getTime() - weekStart0.getTime()) / WEEK_MS);
    if (idx < 0 || idx >= WEEKS) return -1;
    return idx;
  };

  for (const m of arMovements) {
    const idx = bucketIndex(m.timestamp);
    if (idx < 0) continue;
    const amt = Number(m.amount);
    const b = buckets[idx];
    if (!b) continue;
    if (m.kind === 'income') b.arIncome += amt;
    else if (m.kind === 'expense') b.arExpense += amt;
  }
  for (const m of apMovements) {
    const idx = bucketIndex(m.timestamp);
    if (idx < 0) continue;
    const amt = Number(m.amount);
    const b = buckets[idx];
    if (!b) continue;
    if (m.kind === 'income') b.apIncome += amt;
    else if (m.kind === 'expense') b.apExpense += amt;
  }

  type WeekDerived = {
    weekIdx: number;
    start: Date;
    end: Date;
    inflow: number;
    outflow: number;
    net: number;
    balance: number;
  };
  const weeks: WeekDerived[] = [];
  let runningBalance = 0;
  for (let i = 0; i < WEEKS; i++) {
    const b = buckets[i];
    if (!b) continue;
    const start = new Date(weekStart0.getTime() + i * WEEK_MS);
    const end = new Date(start.getTime() + WEEK_MS);
    const inflow = b.arIncome - b.arExpense;
    const outflow = b.apIncome - b.apExpense;
    const net = inflow - outflow;
    runningBalance += net;
    weeks.push({ weekIdx: i, start, end, inflow, outflow, net, balance: runningBalance });
  }

  const totalInflow = weeks.reduce((s, w) => s + w.inflow, 0);
  const totalOutflow = weeks.reduce((s, w) => s + w.outflow, 0);
  const totalNet = weeks.reduce((s, w) => s + w.net, 0);
  const finalBalance = weeks.length > 0 ? (weeks[weeks.length - 1]?.balance ?? 0) : 0;

  // ---------- KPIs ----------
  // KPIs mirror the breakdown's footer totals (net inflow/outflow) so the
  // header and the weekly breakdown agree (#58 — they previously diverged
  // because the KPIs summed gross A/R-charge / A/P-charge while the breakdown
  // showed net-of-collections).
  const fmtSigned = (v: number): string => {
    const sign = v > 0 ? '+' : v < 0 ? '−' : '';
    const abs = Math.abs(v);
    return `${sign}${formatMoney(abs, ctx.tenant.locale, ctx.tenant.currency)}`;
  };

  const kpis: ReportKpiCard[] = [
    {
      id: 'expectedReceivables',
      label: {
        en: 'Expected inflows (13w)',
        ru: 'Ожидаемые поступления (13 нед)',
        tr: 'Beklenen tahsilat (13 hf)',
      },
      value: fmtSigned(totalInflow),
      tone: 'positive',
    },
    {
      id: 'expectedPayments',
      label: {
        en: 'Expected outflows (13w)',
        ru: 'Ожидаемые выплаты (13 нед)',
        tr: 'Beklenen ödeme (13 hf)',
      },
      value: fmtSigned(-totalOutflow),
      tone: 'negative',
    },
    {
      id: 'netPosition',
      label: {
        en: 'Net cash position',
        ru: 'Чистая денежная позиция',
        tr: 'Net nakit pozisyon',
      },
      value: fmtSigned(totalNet),
      tone: totalNet >= 0 ? 'positive' : 'negative',
    },
  ];

  // ---------- Chart section (weekly running balance) ----------
  const points = weeks.map((w) => w.balance);
  const labels = weeks.map((w) => `W${w.weekIdx}`);
  const firstBalance = points[0] ?? 0;
  const lastBalance = points[points.length - 1] ?? 0;
  const changePct =
    Math.abs(firstBalance) > 0.005
      ? ((lastBalance - firstBalance) / Math.abs(firstBalance)) * 100
      : 0;

  const chartSection: ReportChartSection = {
    kind: 'chart',
    totalLabel: fmtSigned(totalNet),
    changePct,
    points,
    labels,
  };

  // ---------- Breakdown rows ----------
  const breakdownRows: ReportBreakdownRow[] = weeks.map((w) => {
    const inflowCell =
      w.inflow > 0.005 ? (
        <span key="i" style={{ color: 'var(--success-text)' }}>
          {fmtSigned(w.inflow)}
        </span>
      ) : w.inflow < -0.005 ? (
        <span key="i" style={{ color: 'var(--danger-text)' }}>
          {fmtSigned(w.inflow)}
        </span>
      ) : (
        '—'
      );
    const outflowCell =
      w.outflow > 0.005 ? (
        <span key="o" style={{ color: 'var(--danger-text)' }}>
          {fmtSigned(-w.outflow)}
        </span>
      ) : w.outflow < -0.005 ? (
        <span key="o" style={{ color: 'var(--success-text)' }}>
          {fmtSigned(-w.outflow)}
        </span>
      ) : (
        '—'
      );
    const netCell =
      w.net >= -0.005 ? (
        fmtSigned(w.net)
      ) : (
        <span key="n" style={{ color: 'var(--danger-text)' }}>
          {fmtSigned(w.net)}
        </span>
      );
    return {
      id: `w${w.weekIdx}`,
      cells: [
        <b key="x">W{w.weekIdx}</b>,
        formatRange(w.start, w.end, ctx.tenant.locale),
        inflowCell,
        outflowCell,
        netCell,
        <b key="b">{formatMoney(w.balance, ctx.tenant.locale, ctx.tenant.currency)}</b>,
      ],
    };
  });

  const breakdownTotals = [
    pickLabel(
      {
        en: `Total (${WEEKS} weeks)`,
        ru: `Итого (${WEEKS} нед)`,
        tr: `Toplam (${WEEKS} hafta)`,
      },
      ctx.tenant.locale,
    ),
    '',
    <span key="i" style={{ color: 'var(--success-text)' }}>
      {fmtSigned(totalInflow)}
    </span>,
    <span key="o" style={{ color: 'var(--danger-text)' }}>
      {fmtSigned(-totalOutflow)}
    </span>,
    fmtSigned(totalNet),
    formatMoney(finalBalance, ctx.tenant.locale, ctx.tenant.currency),
  ];

  return {
    kpis,
    sections: [
      chartSection,
      {
        kind: 'breakdown',
        title: {
          en: 'Weekly breakdown',
          ru: 'По неделям',
          tr: 'Haftalık döküm',
        },
        dimensions: [
          { key: 'all', label: { en: 'All', ru: 'Все', tr: 'Tümü' } },
          {
            key: 'in',
            label: { en: 'Inflows only', ru: 'Только поступления', tr: 'Yalnız giriş' },
          },
          {
            key: 'out',
            label: { en: 'Outflows only', ru: 'Только выплаты', tr: 'Yalnız çıkış' },
          },
        ],
        columns: [
          { key: 'week', label: { en: 'Week', ru: 'Неделя', tr: 'Hafta' } },
          { key: 'range', label: { en: 'Range', ru: 'Период', tr: 'Aralık' } },
          {
            key: 'in',
            label: { en: 'Expected inflow', ru: 'Поступления', tr: 'Tahsilat' },
            align: 'right',
          },
          {
            key: 'out',
            label: { en: 'Expected outflow', ru: 'Выплаты', tr: 'Ödeme' },
            align: 'right',
          },
          {
            key: 'net',
            label: { en: 'Net movement', ru: 'Чистый поток', tr: 'Net hareket' },
            align: 'right',
          },
          {
            key: 'balance',
            label: { en: 'End balance', ru: 'Остаток', tr: 'Bakiye' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow: breakdownTotals,
      },
    ],
  };
}
