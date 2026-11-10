import { formatMoney } from '@/lib/format-money';
import { Link } from '@/platform/i18n/navigation';
import {
  type RegisterChipOption,
  type RegisterRow,
  type RegisterViewConfig,
  type RegisterViewKpi,
  type RegisterViewPayload,
  defineRegisterView,
} from '@/platform/metadata';

const PAYMENT_TERM_DAYS = 30;

/**
 * Accounts Receivable register view — variant-9 parity
 * (mockup: alacaklar-hesabi.html).
 *
 * One row per customer with positive open A/R (income − expense > 0).
 * Imputed due date = earliest unpaid invoice + 30d. Bu Hafta Tahsil
 * KPI counts payments (expense kind) over the last 7 days.
 */
export const accountsReceivableView: RegisterViewConfig = defineViewSpec();

function defineViewSpec(): RegisterViewConfig {
  const config: RegisterViewConfig = {
    id: 'accounts-receivable',
    register: 'sales.accounts_receivable',
    title: {
      en: 'Accounts Receivable',
      ru: 'Дебиторская задолженность',
      tr: 'Alacaklar Hesapları',
    },
    subtitleSecondary: {
      en: 'Accounts Receivable',
      ru: 'Дебиторская задолженность',
      tr: 'Alacaklar Hesapları',
    },
    countLabel: (n) => ({
      en: `${n} customers`,
      ru: `${n} клиентов`,
      tr: `${n} müşteri`,
    }),
    breadcrumb: {
      en: 'Registers / Accounts Receivable',
      ru: 'Регистры / Дебиторская задолженность',
      tr: 'Kayıtlar / Alacaklar Hesapları',
    },
    hubCard: {
      icon: 'wallet',
      description: {
        en: 'Outstanding customer balances by aging.',
        ru: 'Открытые остатки клиентов по срокам.',
        tr: 'Vade bazında açık müşteri bakiyeleri.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: {
        en: 'Search customer…',
        ru: 'Поиск клиента…',
        tr: 'Müşteri ara…',
      },
    },
    columns: [
      { key: 'customer', label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' } },
      {
        key: 'amount',
        label: { en: 'Amount', ru: 'Сумма', tr: 'Alacak' },
        align: 'right',
      },
      { key: 'dueIn', label: { en: 'Due', ru: 'Срок', tr: 'Vade' } },
      { key: 'invoiceNo', label: { en: 'Invoice No', ru: 'Счёт №', tr: 'Fatura No' } },
      { key: 'date', label: { en: 'Date', ru: 'Дата', tr: 'Tarih' } },
    ],
    loader: loadAR,
    paginated: true,
  };
  defineRegisterView(config);
  return config;
}

async function loadAR(
  ctx: Parameters<RegisterViewConfig['loader']>[0],
): Promise<RegisterViewPayload> {
  const { tx, period } = ctx;
  const PAGE = 25;
  const off = (Math.max(1, ctx.page) - 1) * PAGE;
  const startOfWeek = new Date();
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);

  const [arGrouped, invoices, collectedThisWeek, periodMovements] = await Promise.all([
    tx.movement_sales_accounts_receivable.groupBy({
      by: ['customer', 'kind'],
      where: { active: true },
      _sum: { amount: true },
    }),
    tx.document_sales_invoice.findMany({
      where: { deletedAt: null, status: 'POSTED' },
      select: { id: true, customer: true, date: true, number: true },
      orderBy: { date: 'asc' },
    }),
    tx.movement_sales_accounts_receivable.aggregate({
      where: { active: true, kind: 'expense', timestamp: { gte: startOfWeek } },
      _sum: { amount: true },
    }),
    tx.movement_sales_accounts_receivable.findMany({
      where: { active: true, timestamp: { gte: period.start, lt: period.end } },
      orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    }),
  ]);

  const balanceByCustomer = new Map<string, number>();
  for (const r of arGrouped as Array<{
    customer: string;
    kind: string;
    _sum: { amount: number | null };
  }>) {
    const prev = balanceByCustomer.get(r.customer) ?? 0;
    const amt = Number(r._sum.amount ?? 0);
    balanceByCustomer.set(r.customer, prev + (r.kind === 'income' ? amt : -amt));
  }

  const earliestByCustomer = new Map<string, { id: string; date: Date; number: string }>();
  for (const inv of invoices) {
    const prev = earliestByCustomer.get(inv.customer);
    if (!prev || inv.date < prev.date) {
      earliestByCustomer.set(inv.customer, { id: inv.id, date: inv.date, number: inv.number });
    }
  }

  const owingCustomerIds = Array.from(balanceByCustomer.entries())
    .filter(([, bal]) => bal > 0.005)
    .map(([cid]) => cid);

  let customers: Array<{ id: string; name: string }> = [];
  if (owingCustomerIds.length > 0) {
    customers = await tx.catalog_sales_customer.findMany({
      where: { id: { in: owingCustomerIds }, deletedAt: null },
      select: { id: true, name: true },
    });
  }
  const nameById = new Map(customers.map((c) => [c.id, c.name]));

  type ArRow = {
    customerId: string;
    customerName: string;
    amount: number;
    invoiceId: string | null;
    invoiceNumber: string | null;
    invoiceDate: Date | null;
    dueDate: Date | null;
  };

  const today = new Date();
  const all: ArRow[] = owingCustomerIds.map((cid) => {
    const earliest = earliestByCustomer.get(cid);
    const dueDate = earliest
      ? (() => {
          const d = new Date(earliest.date);
          d.setUTCDate(d.getUTCDate() + PAYMENT_TERM_DAYS);
          return d;
        })()
      : null;
    return {
      customerId: cid,
      customerName: nameById.get(cid) ?? cid,
      amount: balanceByCustomer.get(cid) ?? 0,
      invoiceId: earliest?.id ?? null,
      invoiceNumber: earliest?.number ?? null,
      invoiceDate: earliest?.date ?? null,
      dueDate,
    };
  });

  const oneWeek = new Date(today);
  oneWeek.setUTCDate(oneWeek.getUTCDate() + 7);
  const oneMonth = new Date(today);
  oneMonth.setUTCDate(oneMonth.getUTCDate() + 30);

  const overdueRows = all.filter((r) => r.dueDate && r.dueDate < today);
  const dueWeek = all.filter((r) => r.dueDate && r.dueDate >= today && r.dueDate <= oneWeek);
  const dueMonth = all.filter((r) => r.dueDate && r.dueDate >= today && r.dueDate <= oneMonth);

  let filtered = all;
  if (ctx.chip === 'overdue') filtered = overdueRows;
  else if (ctx.chip === 'due-this-week') filtered = dueWeek;
  else if (ctx.chip === 'due-this-month') filtered = dueMonth;
  if (ctx.search) {
    const q = ctx.search.toLowerCase();
    filtered = filtered.filter((r) => r.customerName.toLowerCase().includes(q));
  }
  filtered.sort((a, b) => b.amount - a.amount);

  const totalAmount = all.reduce((s, r) => s + r.amount, 0);
  const overdueAmount = overdueRows.reduce((s, r) => s + r.amount, 0);
  const collectedAmount = Number(collectedThisWeek._sum.amount ?? 0);

  const kpis: RegisterViewKpi[] = [
    {
      id: 'total',
      label: { en: 'Total Receivable', ru: 'Всего к получению', tr: 'Toplam Alacak' },
      value: formatMoney(totalAmount, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'overdue',
      label: { en: 'Overdue', ru: 'Просрочено', tr: 'Vadesi Geçmiş' },
      value: formatMoney(overdueAmount, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'collectedThisWeek',
      label: { en: 'Collected This Week', ru: 'Поступило за неделю', tr: 'Bu Hafta Tahsil' },
      value: formatMoney(collectedAmount, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'activeCustomers',
      label: { en: 'Active Customers', ru: 'Активных клиентов', tr: 'Aktif Müşteri' },
      value: String(all.length),
    },
  ];

  const chips: RegisterChipOption[] = [
    { key: 'all', label: { en: 'All', ru: 'Все', tr: 'Tümü' }, count: all.length },
    {
      key: 'overdue',
      label: { en: 'Overdue', ru: 'Просрочено', tr: 'Vadesi geçmiş' },
      count: overdueRows.length,
    },
    {
      key: 'due-this-week',
      label: { en: 'Due this week', ru: 'На этой неделе', tr: 'Bu hafta' },
      count: dueWeek.length,
    },
    {
      key: 'due-this-month',
      label: { en: 'Due this month', ru: 'В этом месяце', tr: 'Bu ay' },
      count: dueMonth.length,
    },
    {
      key: 'movements',
      label: { en: 'Movements', ru: 'Все движения', tr: 'Hareketler' },
      count: periodMovements.length,
    },
  ];

  const dateFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // movements chip: raw ledger view (one row per movement). Shows
  // counterparties even after their net balance is fully settled.
  if (ctx.chip === 'movements') {
    const movementCustomerIds = Array.from(
      new Set((periodMovements as Array<{ customer: string }>).map((m) => m.customer)),
    ).filter((id) => !nameById.has(id));
    if (movementCustomerIds.length > 0) {
      const extra = await tx.catalog_sales_customer.findMany({
        where: { id: { in: movementCustomerIds }, deletedAt: null },
        select: { id: true, name: true },
      });
      for (const e of extra) nameById.set(e.id, e.name);
    }

    const movementRows: RegisterRow[] = (
      periodMovements as Array<{
        id: string;
        customer: string;
        kind: string;
        amount: unknown;
        timestamp: Date;
        relatedDocRef: string | null;
      }>
    )
      .slice(off, off + PAGE)
      .map((m) => {
        const amt = Number(m.amount ?? 0);
        const signed = m.kind === 'income' ? amt : -amt;
        const name = nameById.get(m.customer) ?? m.customer;
        return {
          id: m.id,
          cells: [
            <span key="c">
              <div className="row-title">{name}</div>
            </span>,
            formatMoney(signed, ctx.tenant.locale, ctx.tenant.currency),
            '—',
            m.relatedDocRef ? (
              <span key="d" className="mono" style={{ fontSize: 12 }}>
                {m.relatedDocRef}
              </span>
            ) : (
              '—'
            ),
            dateFmt.format(m.timestamp),
          ],
        };
      });

    // Reference dueLabel to avoid unused-var lint in this early-return
    // path; defined later in the function for the non-movements branch.
    return {
      kpis,
      chips,
      rows: movementRows,
      totalCount: periodMovements.length,
      subtitleCount: all.length,
      totalsRow: undefined,
    };
  }

  const dueLabel = (label: string): { en: string; ru: string; tr: string } => ({
    en: label,
    ru: label,
    tr: label,
  });
  const overdueDaysLabel = (n: number) => ({
    en: `${n}d overdue`,
    ru: `просрочено на ${n} д.`,
    tr: `${n} gün gecikme`,
  });
  const dueDaysLeftLabel = (n: number) => ({
    en: `${n}d left`,
    ru: `осталось ${n} д.`,
    tr: `${n} gün kaldı`,
  });

  const rows: RegisterRow[] = filtered.slice(off, off + PAGE).map((r) => {
    let dueCell: React.ReactNode = '—';
    if (r.dueDate) {
      const ms = r.dueDate.getTime() - today.getTime();
      const days = Math.round(ms / (24 * 3600 * 1000));
      const label =
        days < 0
          ? (overdueDaysLabel(Math.abs(days))[ctx.tenant.locale as 'tr' | 'en' | 'ru'] ??
            `${Math.abs(days)}d overdue`)
          : (dueDaysLeftLabel(days)[ctx.tenant.locale as 'tr' | 'en' | 'ru'] ?? `${days}d left`);
      const cls = days < 0 ? 'pill-danger' : days <= 7 ? 'pill-warning' : 'pill-success';
      dueCell = <span className={`pill ${cls}`}>{label}</span>;
    }
    return {
      id: r.customerId,
      cells: [
        <span key="c">
          <div className="row-title">{r.customerName}</div>
        </span>,
        formatMoney(r.amount, ctx.tenant.locale, ctx.tenant.currency),
        dueCell,
        r.invoiceId && r.invoiceNumber ? (
          <Link key="n" href={`/documents/sales-invoice/${r.invoiceId}`} className="card-link mono">
            {r.invoiceNumber}
          </Link>
        ) : (
          '—'
        ),
        r.invoiceDate ? dateFmt.format(r.invoiceDate) : '—',
      ],
    };
  });

  // Settled-with-activity empty state: the open-balance (Остатки) list is
  // empty but there ARE movements this period — point the user to the ledger
  // instead of a blank table. The empty Остатки view is itself correct.
  const arLoc = ctx.tenant.locale as 'tr' | 'en' | 'ru';
  const emptyState =
    (!ctx.chip || ctx.chip === 'all') && all.length === 0 && periodMovements.length > 0
      ? {
          title:
            { tr: 'Açık alacak yok', en: 'No open receivables', ru: 'Нет открытой дебиторки' }[
              arLoc
            ] ?? 'No open receivables',
          subtitle:
            {
              tr: `Tüm bakiyeler kapalı · bu dönemde ${periodMovements.length} hareket`,
              en: `All balances settled · ${periodMovements.length} movements this period`,
              ru: `Все расчёты закрыты · ${periodMovements.length} движ. за период`,
            }[arLoc] ?? `All balances settled · ${periodMovements.length} movements`,
          actions: [
            {
              label:
                { tr: 'Hareketleri gör', en: 'View movements', ru: 'Показать движения' }[arLoc] ??
                'View movements',
              href: '?chip=movements',
            },
          ],
        }
      : undefined;

  const payload: RegisterViewPayload = {
    kpis,
    chips,
    rows,
    totalCount: filtered.length,
    subtitleCount: all.length,
    emptyState,
    totalsRow:
      rows.length > 0
        ? [
            { en: 'Total', ru: 'Итого', tr: 'Toplam' }[ctx.tenant.locale as 'en' | 'ru' | 'tr'] ??
              'Total',
            formatMoney(totalAmount, ctx.tenant.locale, ctx.tenant.currency),
            '',
            '',
            '',
          ]
        : undefined,
  };
  // Reference dueLabel to avoid unused-var lint; kept for future i18n
  // expansion when due-state pills become explicit cases.
  void dueLabel;
  return payload;
}
