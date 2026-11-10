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
 * Counterparty Card — per (customer | supplier) opening / period inc / period
 * paid / closing in the counterparty's own original currency. Chip switches
 * between customers (AR) and suppliers (AP). Search filter narrows to one.
 * 1C parity: "Карточка контрагента" / "Counterparty card" rolled up to a
 * one-row-per-party summary; click-through to per-party timeline is future
 * work (today: /v2/registers/accounts_receivable + customer column filter).
 */
export const counterpartyCardReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'counterparty-card',
    title: {
      en: 'Counterparty Card',
      ru: 'Карточка контрагента',
      tr: 'Cari Kartı',
    },
    subtitleSecondary: {
      en: 'Counterparty card',
      ru: 'Карточка контрагента',
      tr: 'Cari kartı',
    },
    breadcrumb: {
      en: 'Reports / Counterparty Card',
      ru: 'Отчёты / Карточка контрагента',
      tr: 'Raporlar / Cari Kartı',
    },
    section: {
      en: 'Operational',
      ru: 'Оперативные',
      tr: 'Operasyonel',
    },
    hubCard: {
      icon: 'wallet-2',
      description: {
        en: 'Per-customer / per-supplier opening, period activity and closing balance.',
        ru: 'Сальдо начала, обороты периода и сальдо конца по каждому контрагенту.',
        tr: 'Cari bazlı açılış, dönem hareketleri ve kapanış bakiyesi.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: { en: 'Search counterparty…', ru: 'Поиск контрагента…', tr: 'Cari ara…' },
    },
    loader: loadCounterpartyCard,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

type Side = 'customers' | 'suppliers';
function resolveSide(chip: string | null): Side {
  return chip === 'suppliers' ? 'suppliers' : 'customers';
}

async function loadCounterpartyCard(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant, search } = ctx;
  const side = resolveSide(ctx.chip);

  // ───────── AR or AP movements, split into opening (pre-period) vs in-period ─────────
  type Bucket = {
    openingBase: number;
    inBase: number;
    paidBase: number;
  };

  if (side === 'customers') {
    const movements = (await tx.movement_sales_accounts_receivable.findMany({
      where: { active: true, timestamp: { lt: period.end } },
      select: {
        customer: true,
        kind: true,
        amount: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    })) as Array<{
      customer: string;
      kind: string;
      amount: unknown;
      timestamp: Date;
    }>;

    const buckets = new Map<string, Bucket>();
    for (const m of movements) {
      const b = buckets.get(m.customer) ?? {
        openingBase: 0,
        inBase: 0,
        paidBase: 0,
      };
      const amt = Number(m.amount ?? 0);
      // AR sign: income (invoice) = increases debt, expense (payment) = decreases.
      const signedDelta = m.kind === 'income' ? amt : -amt;
      if (m.timestamp < period.start) {
        b.openingBase += signedDelta;
      } else if (m.kind === 'income') {
        b.inBase += amt;
      } else {
        b.paidBase += amt;
      }
      buckets.set(m.customer, b);
    }

    return buildPayload({
      side,
      buckets,
      lookup: () =>
        tx.catalog_sales_customer.findMany({
          where: { id: { in: [...buckets.keys()] }, deletedAt: null },
          select: { id: true, name: true, code: true },
        }),
      tenant,
      search,
    });
  }

  // ───────── Supplier path ─────────
  const movements = (await tx.movement_purchases_accounts_payable.findMany({
    where: { active: true, timestamp: { lt: period.end } },
    select: {
      supplier: true,
      kind: true,
      amount: true,
      timestamp: true,
    },
    orderBy: { timestamp: 'asc' },
  })) as Array<{
    supplier: string;
    kind: string;
    amount: unknown;
    timestamp: Date;
  }>;

  const buckets = new Map<string, Bucket>();
  for (const m of movements) {
    const b = buckets.get(m.supplier) ?? {
      openingBase: 0,
      inBase: 0,
      paidBase: 0,
    };
    const amt = Number(m.amount ?? 0);
    // AP sign: income (invoice from supplier) = increases what we owe;
    // expense (payment sent) = decreases.
    const signedDelta = m.kind === 'income' ? amt : -amt;
    if (m.timestamp < period.start) {
      b.openingBase += signedDelta;
    } else if (m.kind === 'income') {
      b.inBase += amt;
    } else {
      b.paidBase += amt;
    }
    buckets.set(m.supplier, b);
  }

  return buildPayload({
    side,
    buckets,
    lookup: () =>
      tx.catalog_purchases_supplier.findMany({
        where: { id: { in: [...buckets.keys()] }, deletedAt: null },
        select: { id: true, name: true, code: true },
      }),
    tenant,
    search,
  });
}

async function buildPayload(args: {
  side: Side;
  buckets: Map<string, { openingBase: number; inBase: number; paidBase: number }>;
  lookup: () => Promise<Array<{ id: string; name: string; code: string }>>;
  tenant: { locale: Locale; currency: string };
  search: string | null;
}): Promise<ReportViewPayload> {
  const { side, buckets, lookup, tenant, search } = args;
  const refs = await lookup();
  const refById = new Map(refs.map((r) => [r.id, r]));

  type Row = {
    id: string;
    name: string;
    code: string;
    opening: number;
    inAmt: number;
    paid: number;
    closing: number;
  };
  const rows: Row[] = [];
  for (const [partyId, b] of buckets) {
    const ref = refById.get(partyId);
    const name = ref?.name ?? partyId.slice(0, 8);
    if (search && !name.toLowerCase().includes(search.toLowerCase())) continue;
    const closing = b.openingBase + b.inBase - b.paidBase;
    if (Math.abs(b.openingBase) < 0.005 && b.inBase === 0 && b.paidBase === 0) continue;
    rows.push({
      id: partyId,
      name,
      code: ref?.code ?? '',
      opening: b.openingBase,
      inAmt: b.inBase,
      paid: b.paidBase,
      closing,
    });
  }
  rows.sort((a, b) => Math.abs(b.closing) - Math.abs(a.closing));

  const totalOpening = rows.reduce((s, r) => s + r.opening, 0);
  const totalIn = rows.reduce((s, r) => s + r.inAmt, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalClosing = rows.reduce((s, r) => s + r.closing, 0);
  const withOpen = rows.filter((r) => Math.abs(r.closing) > 0.005).length;

  const kpis: ReportKpiCard[] = [
    {
      id: 'partyCount',
      label:
        side === 'customers'
          ? { en: 'Customers', ru: 'Клиентов', tr: 'Müşteri' }
          : { en: 'Suppliers', ru: 'Поставщиков', tr: 'Tedarikçi' },
      value: String(rows.length),
    },
    {
      id: 'opening',
      label: { en: 'Opening', ru: 'Сальдо нач.', tr: 'Açılış' },
      value: formatMoney(totalOpening, tenant.locale, tenant.currency),
    },
    {
      id: 'turnover',
      label:
        side === 'customers'
          ? { en: 'Billed', ru: 'Начислено', tr: 'Faturalanan' }
          : { en: 'Owed', ru: 'Начислено', tr: 'Borçlanılan' },
      value: formatMoney(totalIn, tenant.locale, tenant.currency),
    },
    {
      id: 'closingOpen',
      label: {
        en: 'Open balances',
        ru: 'С открытым сальдо',
        tr: 'Açık Bakiyeli',
      },
      value: `${withOpen} · ${formatMoney(totalClosing, tenant.locale, tenant.currency)}`,
      tone: totalClosing > 0 ? 'positive' : totalClosing < 0 ? 'negative' : 'neutral',
    },
  ];

  const breakdownRows: ReportBreakdownRow[] = rows.map((r) => ({
    id: r.id,
    cells: [
      <span key="n">
        <div className="row-title">{r.name}</div>
        <div className="row-sub">{r.code}</div>
      </span>,
      formatMoney(r.opening, tenant.locale, tenant.currency),
      formatMoney(r.inAmt, tenant.locale, tenant.currency),
      formatMoney(r.paid, tenant.locale, tenant.currency),
      formatMoney(r.closing, tenant.locale, tenant.currency),
    ],
  }));

  const totalsRow =
    rows.length > 0
      ? [
          pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, tenant.locale),
          formatMoney(totalOpening, tenant.locale, tenant.currency),
          formatMoney(totalIn, tenant.locale, tenant.currency),
          formatMoney(totalPaid, tenant.locale, tenant.currency),
          formatMoney(totalClosing, tenant.locale, tenant.currency),
        ]
      : undefined;

  return {
    kpis,
    chips: [
      {
        key: 'customers',
        label: { en: 'Customers', ru: 'Клиенты', tr: 'Müşteriler' },
      },
      {
        key: 'suppliers',
        label: { en: 'Suppliers', ru: 'Поставщики', tr: 'Tedarikçiler' },
      },
    ],
    sections: [
      {
        kind: 'breakdown',
        title:
          side === 'customers'
            ? { en: 'Customers', ru: 'Клиенты', tr: 'Müşteri kırılımı' }
            : { en: 'Suppliers', ru: 'Поставщики', tr: 'Tedarikçi kırılımı' },
        columns: [
          { key: 'name', label: { en: 'Counterparty', ru: 'Контрагент', tr: 'Cari' } },
          {
            key: 'open',
            label: { en: 'Opening', ru: 'Сальдо нач.', tr: 'Açılış' },
            align: 'right',
          },
          {
            key: 'in',
            label:
              side === 'customers'
                ? { en: 'Billed', ru: 'Начислено', tr: 'Faturalanan' }
                : { en: 'Owed', ru: 'Начислено', tr: 'Borçlanılan' },
            align: 'right',
          },
          {
            key: 'paid',
            label:
              side === 'customers'
                ? { en: 'Collected', ru: 'Поступления', tr: 'Tahsil edilen' }
                : { en: 'Paid', ru: 'Оплачено', tr: 'Ödenen' },
            align: 'right',
          },
          {
            key: 'close',
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
