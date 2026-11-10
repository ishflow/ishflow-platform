import {
  accountsPayableTotal,
  accountsReceivableTotal,
  cashFundsTotal,
  thisMonthSalesTotal,
} from '@/platform/engine/dashboard-queries';
import { defineDashboardWidget } from '@/platform/metadata';

export type KpiStripPayload = {
  currency: string;
  cash: { value: number; delta: number };
  receivables: { value: number; delta: number };
  payables: { value: number; delta: number };
  sales: { value: number; delta: number };
};

defineDashboardWidget<KpiStripPayload>({
  id: 'kpi-strip',
  title: { en: 'Key KPI', ru: 'Ключевые KPI', tr: 'Anahtar KPI' },
  layout: 'full-row',
  renderer: 'kpi-strip',
  permissions: { read: 'tenant' },
  requires: ['sales.invoice:read', 'purchases.invoice:read'],
  async loader(ctx) {
    const queries = { tenant: { id: ctx.tenant.id } } as Parameters<
      typeof accountsReceivableTotal
    >[0];
    const [ar, ap, ms, cash] = await Promise.all([
      accountsReceivableTotal(queries),
      accountsPayableTotal(queries),
      thisMonthSalesTotal(queries),
      cashFundsTotal(queries),
    ]);
    return {
      currency: ctx.tenant.currency,
      cash: { value: cash.current, delta: cash.delta },
      receivables: { value: ar.current, delta: ar.delta },
      payables: { value: ap.current, delta: ap.delta },
      sales: { value: ms.current, delta: ms.delta },
    };
  },
});
