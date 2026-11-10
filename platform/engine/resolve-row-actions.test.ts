import type { DocumentConfig } from '@/platform/metadata';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./posted-balance-by-doc', () => ({
  openBalancesForDocs: vi.fn(async ({ invoiceIds }: { invoiceIds: string[] }) => {
    const m = new Map<string, { amount: number; original: number; currency: string }>();
    if (invoiceIds.includes('inv-open'))
      m.set('inv-open', { amount: 100, original: 100, currency: 'USD' });
    if (invoiceIds.includes('inv-partial'))
      m.set('inv-partial', { amount: 30, original: 30, currency: 'USD' });
    return m;
  }),
}));

import { resolveRowActions } from './resolve-row-actions';

const baseConfig: DocumentConfig = {
  id: 'sales.invoice',
  module: 'sales',
  name: 'invoice',
  label: { en: 'Sales Invoice' },
  header: {},
  posting: {},
  permissions: { read: 'any' },
  rowActions: [
    {
      key: 'recordPayment',
      target: 'sales.payment_received',
      icon: 'HandCoins',
      label: { en: 'Record payment', tr: 'Tahsilat al' },
      visibleWhen: {
        status: 'POSTED',
        openBalance: { register: 'sales.accounts_receivable' },
      },
      map: {
        customer: { source: 'self.field', field: 'customer' },
        customerName: { source: 'refLabel', field: 'customer' },
        invoice: { source: 'self.id' },
        invoiceNumber: { source: 'self.field', field: 'number' },
        amount: { source: 'openBalance.original' },
      },
    },
  ],
};

describe('resolveRowActions', () => {
  it('emits an action for posted rows with open balance', async () => {
    const out = await resolveRowActions({
      config: baseConfig,
      tenantId: 't1',
      locale: 'tr',
      rows: [
        {
          id: 'inv-open',
          status: 'POSTED',
          fields: { customer: 'cust-1', number: 'INVOICE-000001' },
          refLabels: { customer: 'Acme' },
        },
      ],
    });
    const list = out.get('inv-open');
    expect(list).toBeDefined();
    expect(list).toHaveLength(1);
    const a = list?.[0];
    expect(a?.label).toBe('Tahsilat al');
    expect(a?.icon).toBe('HandCoins');
    expect(a?.href).toContain('/documents/payment-received/new?');
    const url = new URL(a?.href ?? '', 'http://x');
    expect(url.searchParams.get('customer')).toBe('cust-1');
    expect(url.searchParams.get('customerName')).toBe('Acme');
    expect(url.searchParams.get('invoice')).toBe('inv-open');
    expect(url.searchParams.get('invoiceNumber')).toBe('INVOICE-000001');
    expect(url.searchParams.get('amount')).toBe('100.00');
  });

  it('falls back to label.en when locale is missing', async () => {
    const out = await resolveRowActions({
      config: baseConfig,
      tenantId: 't1',
      locale: 'de',
      rows: [
        {
          id: 'inv-open',
          status: 'POSTED',
          fields: { customer: 'cust-1', number: 'X' },
          refLabels: { customer: 'Acme' },
        },
      ],
    });
    expect(out.get('inv-open')?.[0]?.label).toBe('Record payment');
  });

  it('skips rows whose status does not match visibleWhen.status', async () => {
    const out = await resolveRowActions({
      config: baseConfig,
      tenantId: 't1',
      locale: 'tr',
      rows: [
        {
          id: 'inv-open',
          status: 'SAVED',
          fields: { customer: 'cust-1', number: 'X' },
          refLabels: { customer: 'Acme' },
        },
      ],
    });
    expect(out.has('inv-open')).toBe(false);
  });

  it('skips rows with zero open balance', async () => {
    const out = await resolveRowActions({
      config: baseConfig,
      tenantId: 't1',
      locale: 'tr',
      rows: [
        {
          id: 'inv-zero',
          status: 'POSTED',
          fields: { customer: 'c', number: 'X' },
          refLabels: { customer: 'Acme' },
        },
      ],
    });
    expect(out.has('inv-zero')).toBe(false);
  });

  it('skips action when a required mapping source resolves to null', async () => {
    const out = await resolveRowActions({
      config: baseConfig,
      tenantId: 't1',
      locale: 'tr',
      rows: [
        {
          // missing refLabel.customer → customerName resolves to null → action skipped
          id: 'inv-open',
          status: 'POSTED',
          fields: { customer: 'c', number: 'X' },
          refLabels: {},
        },
      ],
    });
    expect(out.has('inv-open')).toBe(false);
  });

  it('returns empty map when config has no rowActions', async () => {
    const out = await resolveRowActions({
      config: { ...baseConfig, rowActions: undefined },
      tenantId: 't1',
      locale: 'tr',
      rows: [
        {
          id: 'inv-open',
          status: 'POSTED',
          fields: { customer: 'c', number: 'X' },
          refLabels: { customer: 'Acme' },
        },
      ],
    });
    expect(out.size).toBe(0);
  });
});
