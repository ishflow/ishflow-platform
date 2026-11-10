import { afterEach, describe, expect, it } from 'vitest';
import {
  clearDashboardRegistry,
  defineDashboardOrder,
  defineDashboardWidget,
  getDashboardRegistry,
} from './dashboard';

describe('dashboard registry', () => {
  afterEach(() => {
    clearDashboardRegistry();
  });

  it('registers widgets by id', () => {
    defineDashboardWidget({
      id: 'demo',
      title: { en: 'Demo', ru: '', tr: '' },
      layout: 'full-row',
      renderer: 'demo',
      loader: async () => ({ ok: true }),
    });
    const reg = getDashboardRegistry();
    expect(reg.widgets.get('demo')).toBeDefined();
  });

  it('rejects duplicate widget ids', () => {
    defineDashboardWidget({
      id: 'dup',
      title: { en: 'Dup', ru: '', tr: '' },
      layout: 'full-row',
      renderer: 'dup',
      loader: async () => ({}),
    });
    expect(() =>
      defineDashboardWidget({
        id: 'dup',
        title: { en: 'Dup', ru: '', tr: '' },
        layout: 'full-row',
        renderer: 'dup',
        loader: async () => ({}),
      }),
    ).toThrow(/already registered/);
  });

  it('stores the order config and returns it from getDashboardRegistry', () => {
    defineDashboardOrder(['kpi-strip', ['revenue-chart', 'top-customers'], 'recent-invoices']);
    const reg = getDashboardRegistry();
    expect(reg.order).toEqual(['kpi-strip', ['revenue-chart', 'top-customers'], 'recent-invoices']);
  });

  it('starts with null order and empty widgets after clear', () => {
    defineDashboardWidget({
      id: 'will-clear',
      title: { en: 'X', ru: '', tr: '' },
      layout: 'half-row',
      renderer: 'x',
      loader: async () => ({}),
    });
    defineDashboardOrder(['will-clear']);
    clearDashboardRegistry();
    const reg = getDashboardRegistry();
    expect(reg.widgets.size).toBe(0);
    expect(reg.order).toBeNull();
  });
});
