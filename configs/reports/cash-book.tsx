import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportKpiCard,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Cash Book (КО-4) — per (cash register, day) opening / income /
 * expense / closing. Opening for day D is closing of D-1 (or the
 * catalog opening_balance if no prior movement).
 *
 * Opening balances on the registers are read via raw SQL —
 * `openingBalance` was added in Phase 1 after the dev server cached
 * the Prisma client; this is the same workaround used by
 * `cashFundsTotal` in dashboard-queries.ts and the cash-funds
 * register view. Collapses to ORM once the Prisma client is
 * universally regenerated.
 */
export const cashBookReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'cash-book',
    title: {
      en: 'Cash Book',
      ru: 'Кассовая книга',
      tr: 'Kasa Defteri',
    },
    subtitleSecondary: { en: 'Cash book', ru: 'Кассовая книга', tr: 'Kasa defteri' },
    breadcrumb: {
      en: 'Reports / Cash Book',
      ru: 'Отчёты / Кассовая книга',
      tr: 'Raporlar / Kasa Defteri',
    },
    section: {
      en: 'Treasury',
      ru: 'Касса',
      tr: 'Kasa',
    },
    hubCard: {
      icon: 'wallet',
      description: {
        en: 'Daily opening / in / out / closing per cash register (КО-4).',
        ru: 'Ежедневное сальдо / приход / расход / остаток по кассам (КО-4).',
        tr: 'Kasa bazlı günlük açılış / giriş / çıkış / kapanış (КО-4).',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadCashBook,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadCashBook(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;
  const periodStart =
    period.kind === 'range' ? period.start : period.kind === 'day' ? period.date : period.start;
  const periodEnd =
    period.kind === 'range' ? period.end : period.kind === 'day' ? period.date : period.end;

  // Registers + opening balances (raw SQL — Phase 1 workaround).
  const registers = (await tx.$queryRawUnsafe(
    `SELECT id, name, opening_balance AS "openingBalance"
     FROM catalog_treasury_cash_register
     WHERE deleted_at IS NULL
     ORDER BY name ASC`,
  )) as Array<{ id: string; name: string; openingBalance: unknown }>;

  // All movements up to periodEnd — pre-period totals roll forward
  // into each register's running opening for the in-period days.
  const movements = (await tx.movement_treasury_cash_funds.findMany({
    where: { active: true, timestamp: { lt: periodEnd } },
    orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }],
    select: { cashRegister: true, kind: true, amount: true, timestamp: true },
  })) as Array<{
    cashRegister: string;
    kind: string;
    amount: unknown;
    timestamp: Date;
  }>;

  type DayBucket = {
    opening: number;
    income: number;
    expense: number;
    closing: number;
  };
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  const buckets = new Map<string, Map<string, DayBucket>>();
  const runningOpening = new Map<string, number>();
  for (const r of registers) {
    runningOpening.set(r.id, Number(r.openingBalance ?? 0));
    buckets.set(r.id, new Map());
  }

  for (const m of movements) {
    const amt = Number(m.amount ?? 0);
    const signed = m.kind === 'income' ? amt : -amt;
    const inPeriod = m.timestamp >= periodStart && m.timestamp < periodEnd;
    if (!inPeriod) {
      // Roll into the running opening for the period (pre-period side).
      runningOpening.set(m.cashRegister, (runningOpening.get(m.cashRegister) ?? 0) + signed);
      continue;
    }
    const key = dayKey(m.timestamp);
    const regBuckets = buckets.get(m.cashRegister);
    if (!regBuckets) continue;
    if (!regBuckets.has(key)) {
      const opening = runningOpening.get(m.cashRegister) ?? 0;
      regBuckets.set(key, {
        opening,
        income: 0,
        expense: 0,
        closing: opening,
      });
    }
    const bucket = regBuckets.get(key);
    if (!bucket) continue;
    if (m.kind === 'income') bucket.income += amt;
    else if (m.kind === 'expense') bucket.expense += amt;
    bucket.closing = bucket.opening + (bucket.income - bucket.expense);
    runningOpening.set(m.cashRegister, bucket.closing);
  }

  // Flatten to rows.
  type Row = {
    regId: string;
    regName: string;
    day: string;
    opening: number;
    income: number;
    expense: number;
    closing: number;
  };
  const rows: Row[] = [];
  for (const r of registers) {
    const regBuckets = buckets.get(r.id) ?? new Map<string, DayBucket>();
    for (const [day, b] of regBuckets) {
      rows.push({
        regId: r.id,
        regName: r.name,
        day,
        opening: b.opening,
        income: b.income,
        expense: b.expense,
        closing: b.closing,
      });
    }
  }
  rows.sort((a, b) =>
    a.regName !== b.regName ? a.regName.localeCompare(b.regName) : a.day.localeCompare(b.day),
  );

  // KPIs.
  let periodIncome = 0;
  let periodExpense = 0;
  for (const row of rows) {
    periodIncome += row.income;
    periodExpense += row.expense;
  }
  const netChange = periodIncome - periodExpense;
  const activeRegisterCount = new Set(rows.map((r) => r.regId)).size;

  const kpis: ReportKpiCard[] = [
    {
      id: 'periodIncome',
      label: {
        en: 'Period Income',
        ru: 'Поступления за период',
        tr: 'Dönem Geliri',
      },
      value: formatMoney(periodIncome, tenant.locale, tenant.currency),
      tone: 'positive',
    },
    {
      id: 'periodExpense',
      label: {
        en: 'Period Expense',
        ru: 'Расходы за период',
        tr: 'Dönem Gideri',
      },
      value: formatMoney(periodExpense, tenant.locale, tenant.currency),
      tone: 'negative',
    },
    {
      id: 'netChange',
      label: { en: 'Net Change', ru: 'Чистое изменение', tr: 'Net Değişim' },
      value: formatMoney(netChange, tenant.locale, tenant.currency),
      tone: netChange >= 0 ? 'positive' : 'negative',
    },
    {
      id: 'activeRegisters',
      label: {
        en: 'Active Registers',
        ru: 'Активных касс',
        tr: 'Aktif Kasa',
      },
      value: String(activeRegisterCount),
    },
  ];

  const dateFmt = new Intl.DateTimeFormat(tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const breakdownRows: ReportBreakdownRow[] = rows.map((r) => ({
    id: `${r.regId}:${r.day}`,
    cells: [
      r.regName,
      dateFmt.format(new Date(`${r.day}T00:00:00Z`)),
      formatMoney(r.opening, tenant.locale, tenant.currency),
      formatMoney(r.income, tenant.locale, tenant.currency),
      formatMoney(r.expense, tenant.locale, tenant.currency),
      formatMoney(r.closing, tenant.locale, tenant.currency),
    ],
  }));

  const totalsRow =
    rows.length > 0
      ? [
          pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, tenant.locale),
          '',
          '',
          formatMoney(periodIncome, tenant.locale, tenant.currency),
          formatMoney(periodExpense, tenant.locale, tenant.currency),
          formatMoney(netChange, tenant.locale, tenant.currency),
        ]
      : undefined;

  return {
    kpis,
    sections: [
      {
        kind: 'breakdown',
        title: {
          en: 'Daily breakdown',
          ru: 'Ежедневная разбивка',
          tr: 'Günlük döküm',
        },
        columns: [
          {
            key: 'register',
            label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' },
          },
          { key: 'day', label: { en: 'Date', ru: 'Дата', tr: 'Tarih' } },
          {
            key: 'opening',
            label: { en: 'Opening', ru: 'Сальдо нач.', tr: 'Açılış' },
            align: 'right',
          },
          {
            key: 'income',
            label: { en: 'Income', ru: 'Приход', tr: 'Gelir' },
            align: 'right',
          },
          {
            key: 'expense',
            label: { en: 'Expense', ru: 'Расход', tr: 'Gider' },
            align: 'right',
          },
          {
            key: 'closing',
            label: { en: 'Closing', ru: 'Сальдо кон.', tr: 'Kapanış' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow,
      },
    ],
  };
}
