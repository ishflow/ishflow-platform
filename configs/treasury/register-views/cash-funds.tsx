import { formatMoney } from '@/lib/format-money';
import {
  type RegisterChipOption,
  type RegisterRow,
  type RegisterViewConfig,
  type RegisterViewKpi,
  type RegisterViewPayload,
  defineRegisterView,
} from '@/platform/metadata';

/**
 * Cash Funds register view — one row per movement (income/expense)
 * per cash register. KPIs reflect *current* state (opening + signed
 * movement total). The table reflects the selected period.
 *
 * Opening balance is read via raw SQL because the column was added
 * after the Prisma client was cached in the dev server; this is the
 * same Phase 1 workaround used by the cash-registers catalog list.
 * Once `renderV2CatalogList` lands and that list page is retargeted
 * to the engine, this read can collapse to Prisma ORM.
 */
export const cashFundsView: RegisterViewConfig = defineViewSpec();

function defineViewSpec(): RegisterViewConfig {
  const config: RegisterViewConfig = {
    id: 'cash-funds',
    register: 'treasury.cash_funds',
    title: {
      en: 'Cash Funds',
      ru: 'Денежные средства',
      tr: 'Kasa Hareketleri',
    },
    subtitleSecondary: {
      en: 'Cash Funds',
      ru: 'Денежные средства',
      tr: 'Kasa Hareketleri',
    },
    countLabel: (n) => ({
      en: `${n} movements`,
      ru: `${n} движений`,
      tr: `${n} hareket`,
    }),
    breadcrumb: {
      en: 'Registers / Cash Funds',
      ru: 'Регистры / Денежные средства',
      tr: 'Kayıtlar / Kasa Hareketleri',
    },
    hubCard: {
      icon: 'wallet',
      description: {
        en: 'Per cash register balances and movement history.',
        ru: 'Остатки и история движений по кассам.',
        tr: 'Kasa bazlı bakiyeler ve hareket geçmişi.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: {
        en: 'Search cash register…',
        ru: 'Поиск кассы…',
        tr: 'Kasa ara…',
      },
    },
    columns: [
      { key: 'date', label: { en: 'Date', ru: 'Дата', tr: 'Tarih' } },
      { key: 'register', label: { en: 'Cash Register', ru: 'Касса', tr: 'Kasa' } },
      { key: 'kind', label: { en: 'Type', ru: 'Тип', tr: 'Tür' } },
      {
        key: 'amount',
        label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
        align: 'right',
      },
      { key: 'doc', label: { en: 'Document', ru: 'Документ', tr: 'Belge' } },
    ],
    loader: loadCashFunds,
    paginated: true,
  };
  defineRegisterView(config);
  return config;
}

type CashRegisterRow = {
  id: string;
  code: string;
  name: string;
  openingBalance: unknown;
};

type CashMovement = {
  id: string;
  cashRegister: string;
  kind: string;
  amount: unknown;
  timestamp: Date;
  relatedDocRef: string | null;
  createdAt: Date;
};

type LifetimeGroupRow = {
  cashRegister: string;
  kind: string;
  _sum: { amount: number | null };
};

async function loadCashFunds(
  ctx: Parameters<RegisterViewConfig['loader']>[0],
): Promise<RegisterViewPayload> {
  const { tx, period } = ctx;
  const PAGE = 25;
  const off = (Math.max(1, ctx.page) - 1) * PAGE;
  const periodStart = period.start;
  const periodEnd = period.end;

  // 1. Cash registers + opening balances (raw SQL — Phase 1 workaround).
  const registers = (await tx.$queryRawUnsafe(
    `SELECT id, code, name, opening_balance AS "openingBalance"
     FROM catalog_treasury_cash_register
     WHERE deleted_at IS NULL
     ORDER BY name ASC`,
  )) as CashRegisterRow[];
  const registerNameById = new Map(registers.map((r) => [r.id, r.name]));

  // 2. Period-scoped movements for the table.
  const periodMovements = (await tx.movement_treasury_cash_funds.findMany({
    where: {
      active: true,
      timestamp: { gte: periodStart, lt: periodEnd },
    },
    orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
    take: 5000,
  })) as unknown as CashMovement[];

  // 3. Lifetime aggregation for current-balance KPI.
  const lifetimeGroup = (await tx.movement_treasury_cash_funds.groupBy({
    by: ['cashRegister', 'kind'],
    where: { active: true },
    _sum: { amount: true },
  })) as unknown as LifetimeGroupRow[];

  const lifetimeByRegister = new Map<string, number>();
  for (const r of lifetimeGroup) {
    const prev = lifetimeByRegister.get(r.cashRegister) ?? 0;
    const amt = Number(r._sum.amount ?? 0);
    lifetimeByRegister.set(r.cashRegister, prev + (r.kind === 'income' ? amt : -amt));
  }

  // 4. KPIs.
  let totalCash = 0;
  for (const r of registers) {
    const opening = Number(r.openingBalance ?? 0);
    const movements = lifetimeByRegister.get(r.id) ?? 0;
    totalCash += opening + movements;
  }
  let periodIncome = 0;
  let periodExpense = 0;
  for (const m of periodMovements) {
    const amt = Number(m.amount ?? 0);
    if (m.kind === 'income') periodIncome += amt;
    else if (m.kind === 'expense') periodExpense += amt;
  }
  const activeRegisters = registers.filter((r) => {
    const opening = Number(r.openingBalance ?? 0);
    const movements = lifetimeByRegister.get(r.id) ?? 0;
    return opening !== 0 || movements !== 0;
  }).length;

  const kpis: RegisterViewKpi[] = [
    {
      id: 'totalCash',
      label: { en: 'Total Cash', ru: 'Всего в кассах', tr: 'Toplam Kasa' },
      value: formatMoney(totalCash, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'periodIncome',
      label: { en: 'Income (period)', ru: 'Поступления (период)', tr: 'Gelir (dönem)' },
      value: formatMoney(periodIncome, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'periodExpense',
      label: { en: 'Expense (period)', ru: 'Расходы (период)', tr: 'Gider (dönem)' },
      value: formatMoney(periodExpense, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'activeRegisters',
      label: { en: 'Active Registers', ru: 'Активных касс', tr: 'Aktif Kasa' },
      value: String(activeRegisters),
    },
  ];

  // 5. Chips: all / income / expense / per-register (when ≤ 5 registers).
  const chips: RegisterChipOption[] = [
    { key: 'all', label: { en: 'All', ru: 'Все', tr: 'Tümü' }, count: periodMovements.length },
    {
      key: 'income',
      label: { en: 'Income', ru: 'Поступления', tr: 'Gelir' },
      count: periodMovements.filter((m) => m.kind === 'income').length,
    },
    {
      key: 'expense',
      label: { en: 'Expense', ru: 'Расходы', tr: 'Gider' },
      count: periodMovements.filter((m) => m.kind === 'expense').length,
    },
  ];
  if (registers.length > 0 && registers.length <= 5) {
    for (const r of registers) {
      chips.push({
        key: `reg:${r.id}`,
        label: { en: r.name, ru: r.name, tr: r.name },
        count: periodMovements.filter((m) => m.cashRegister === r.id).length,
      });
    }
  }

  // 6. Apply chip filter.
  let filtered: CashMovement[] = periodMovements;
  if (ctx.chip === 'income') {
    filtered = periodMovements.filter((m) => m.kind === 'income');
  } else if (ctx.chip === 'expense') {
    filtered = periodMovements.filter((m) => m.kind === 'expense');
  } else if (ctx.chip?.startsWith('reg:')) {
    const id = ctx.chip.slice(4);
    filtered = periodMovements.filter((m) => m.cashRegister === id);
  }

  if (ctx.search) {
    const q = ctx.search.toLowerCase();
    filtered = filtered.filter((m) => {
      const name = registerNameById.get(m.cashRegister) ?? '';
      return name.toLowerCase().includes(q);
    });
  }

  // 7. Render rows.
  const dateFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const kindLabel = (k: string): string => {
    const labels =
      k === 'income'
        ? { en: 'Income', ru: 'Поступление', tr: 'Gelir' }
        : { en: 'Expense', ru: 'Расход', tr: 'Gider' };
    return labels[ctx.tenant.locale as 'en' | 'ru' | 'tr'] ?? labels.en;
  };

  const rows: RegisterRow[] = filtered.slice(off, off + PAGE).map((m) => {
    const amt = Number(m.amount ?? 0);
    const signed = m.kind === 'income' ? amt : -amt;
    const tone = m.kind === 'income' ? 'pill-success' : 'pill-danger';
    return {
      id: m.id,
      cells: [
        dateFmt.format(m.timestamp),
        registerNameById.get(m.cashRegister) ?? m.cashRegister,
        <span key="k" className={`pill ${tone}`}>
          {kindLabel(m.kind)}
        </span>,
        formatMoney(signed, ctx.tenant.locale, ctx.tenant.currency),
        m.relatedDocRef ? (
          <span key="d" className="mono" style={{ fontSize: 12 }}>
            {m.relatedDocRef}
          </span>
        ) : (
          '—'
        ),
      ],
    };
  });

  const totalLabel = ((): string => {
    if (ctx.tenant.locale === 'tr') return 'Toplam';
    if (ctx.tenant.locale === 'ru') return 'Итого';
    return 'Total';
  })();

  return {
    kpis,
    chips,
    rows,
    totalCount: filtered.length,
    subtitleCount: periodMovements.length,
    totalsRow:
      rows.length > 0
        ? [
            totalLabel,
            '',
            '',
            formatMoney(
              filtered.reduce((s, m) => {
                const amt = Number(m.amount ?? 0);
                return s + (m.kind === 'income' ? amt : -amt);
              }, 0),
              ctx.tenant.locale,
              ctx.tenant.currency,
            ),
            '',
          ]
        : undefined,
  };
}
