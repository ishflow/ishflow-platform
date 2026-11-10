import { afterEach, describe, expect, it } from 'vitest';
import {
  type RegisterViewConfig,
  clearRegisterViewRegistry,
  defineRegisterOrder,
  defineRegisterView,
  getRegisterViewRegistry,
} from './register-view';

const minimalConfig = (id: string): RegisterViewConfig => ({
  id,
  register: 'inventory.stock_balance',
  title: { en: 'Demo', ru: '', tr: '' },
  subtitleSecondary: { en: 'Demo', ru: 'Демо', tr: 'Demo' },
  countLabel: (n) => ({ en: `${n} items`, ru: '', tr: '' }),
  breadcrumb: { en: 'Registers / Demo', ru: '', tr: '' },
  hubCard: {
    icon: 'boxes',
    description: { en: 'Demo card', ru: '', tr: '' },
  },
  topbar: { periodPicker: 'month', exportButton: true },
  search: { placeholder: { en: 'Search…', ru: '', tr: '' } },
  columns: [],
  loader: async () => ({
    kpis: [],
    chips: [],
    rows: [],
    totalCount: 0,
    subtitleCount: 0,
  }),
});

describe('register view registry', () => {
  afterEach(() => {
    clearRegisterViewRegistry();
  });

  it('registers views by id', () => {
    defineRegisterView(minimalConfig('demo'));
    const reg = getRegisterViewRegistry();
    expect(reg.views.get('demo')).toBeDefined();
  });

  it('replaces existing entry on duplicate id (HMR-safe)', () => {
    defineRegisterView(minimalConfig('dup'));
    const replacement = {
      ...minimalConfig('dup'),
      subtitleSecondary: { en: 'replaced', ru: 'replaced', tr: 'replaced' },
    };
    defineRegisterView(replacement);
    expect(getRegisterViewRegistry().views.get('dup')?.subtitleSecondary.en).toBe('replaced');
  });

  it('stores the order config and returns it from getRegisterViewRegistry', () => {
    defineRegisterOrder(['accounts-receivable', 'accounts-payable', 'stock-balance', 'sales']);
    const reg = getRegisterViewRegistry();
    expect(reg.order).toEqual([
      'accounts-receivable',
      'accounts-payable',
      'stock-balance',
      'sales',
    ]);
  });

  it('accepts a config whose loader returns a matrix payload', () => {
    const matrixConfig: RegisterViewConfig = {
      ...minimalConfig('with-matrix'),
      loader: async () => ({
        kpis: [],
        chips: [],
        rows: [],
        totalCount: 1,
        subtitleCount: 1,
        matrix: {
          columns: [
            {
              id: 'c-cost',
              code: 'CST',
              title: 'Cost',
              locked: true,
              defaultVisible: true,
            },
          ],
          rows: [{ id: 'r-1', title: 'Product 1' }],
          cells: [[{ formatted: '$10.00', tag: 'cost' }]],
        },
      }),
    };
    defineRegisterView(matrixConfig);
    expect(getRegisterViewRegistry().views.get('with-matrix')).toBeDefined();
  });

  it('starts with null order and empty views after clear', () => {
    defineRegisterView(minimalConfig('will-clear'));
    defineRegisterOrder(['will-clear']);
    clearRegisterViewRegistry();
    const reg = getRegisterViewRegistry();
    expect(reg.views.size).toBe(0);
    expect(reg.order).toBeNull();
  });
});
