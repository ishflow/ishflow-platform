import { formatMoney } from '@/lib/format-money';
import {
  type ReportBreakdownRow,
  type ReportViewConfig,
  type ReportViewCtx,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared/pick-label';

/**
 * VAT report — net tax owed to the state for the period.
 *   Output VAT = Σ finance.vat kind='income'  (collected on sales)
 *   Input  VAT = Σ finance.vat kind='expense' (paid on purchases, reclaimable)
 *   Net payable = Output − Input
 *
 * Movements are only written when `admin.tax.taxEnabled` is on (see
 * platform/engine/tax.ts), so this report is empty for tenants not using VAT.
 */
export const vatReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'vat',
    title: { en: 'VAT', ru: 'НДС', tr: 'KDV' },
    subtitleSecondary: { en: 'VAT', ru: 'НДС', tr: 'KDV' },
    breadcrumb: {
      en: 'Reports / VAT',
      ru: 'Отчёты / НДС',
      tr: 'Raporlar / KDV',
    },
    section: { en: 'Statements', ru: 'Отчёты', tr: 'Tablolar' },
    hubCard: {
      icon: 'dollar-sign',
      description: {
        en: 'Output vs input VAT and net tax payable for the period.',
        ru: 'Исходящий и входящий НДС и чистый налог к уплате за период.',
        tr: 'Dönem için hesaplanan/indirilecek KDV ve net ödenecek vergi.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadVat,
    permissions: { read: 'tenant' },
  };
  defineReportView(config);
  return config;
}

async function loadVat(ctx: ReportViewCtx): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;
  const money = (n: number) => formatMoney(n, tenant.locale, tenant.currency);

  const grouped = await tx.movement_finance_vat.groupBy({
    by: ['counterparty', 'kind'],
    where: { active: true, timestamp: { gte: period.start, lt: period.end } },
    _sum: { amount: true },
  });

  let output = 0;
  let input = 0;
  // Per-counterparty net VAT (output − input) for the breakdown table.
  const byCounterparty = new Map<string, { output: number; input: number }>();
  for (const g of grouped) {
    const v = Number(g._sum.amount ?? 0);
    const key = g.counterparty ?? '—';
    const acc = byCounterparty.get(key) ?? { output: 0, input: 0 };
    if (g.kind === 'income') {
      output += v;
      acc.output += v;
    } else if (g.kind === 'expense') {
      input += v;
      acc.input += v;
    }
    byCounterparty.set(key, acc);
  }
  const net = output - input;

  // Resolve counterparty display names from BOTH catalogs (a VAT counterparty
  // may be a customer or a supplier). Best-effort — falls back to a short id.
  const ids = Array.from(byCounterparty.keys()).filter((k) => k !== '—');
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const [customers, suppliers] = await Promise.all([
      tx.catalog_sales_customer.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }),
      tx.catalog_purchases_supplier.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }),
    ]);
    for (const c of customers) nameById.set(c.id, c.name);
    for (const s of suppliers) if (!nameById.has(s.id)) nameById.set(s.id, s.name);
  }

  const rows: ReportBreakdownRow[] = Array.from(byCounterparty.entries())
    .map(([id, agg]) => ({ id, agg, netv: agg.output - agg.input }))
    .sort((a, b) => Math.abs(b.netv) - Math.abs(a.netv))
    .map(({ id, agg, netv }) => ({
      id,
      cells: [
        id === '—' ? '—' : (nameById.get(id) ?? `${id.slice(0, 8)}…`),
        money(agg.output),
        money(agg.input),
        money(netv),
      ],
    }));

  return {
    kpis: [
      {
        id: 'output',
        label: { en: 'Output VAT (collected)', ru: 'Исходящий НДС', tr: 'Hesaplanan KDV' },
        value: money(output),
      },
      {
        id: 'input',
        label: { en: 'Input VAT (paid)', ru: 'Входящий НДС', tr: 'İndirilecek KDV' },
        value: money(input),
      },
      {
        id: 'net',
        label: { en: 'Net VAT payable', ru: 'НДС к уплате', tr: 'Ödenecek Net KDV' },
        value: money(net),
        tone: net > 0 ? 'negative' : 'positive',
      },
    ],
    sections: [
      {
        kind: 'breakdown',
        title: { en: 'By counterparty', ru: 'По контрагентам', tr: 'Cariye göre' },
        columns: [
          { key: 'counterparty', label: { en: 'Counterparty', ru: 'Контрагент', tr: 'Cari' } },
          {
            key: 'output',
            label: { en: 'Output', ru: 'Исходящий', tr: 'Hesaplanan' },
            align: 'right',
          },
          {
            key: 'input',
            label: { en: 'Input', ru: 'Входящий', tr: 'İndirilecek' },
            align: 'right',
          },
          { key: 'net', label: { en: 'Net', ru: 'Нетто', tr: 'Net' }, align: 'right' },
        ],
        rows,
        totalsRow: [
          pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, tenant.locale),
          money(output),
          money(input),
          money(net),
        ],
      },
    ],
  };
}
