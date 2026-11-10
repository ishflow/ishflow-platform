import { beforeEach, describe, expect, it } from 'vitest';
import {
  type ReportViewConfig,
  clearReportRegistry,
  defineReportOrder,
  defineReportView,
  getReportRegistry,
} from './report-view';

const minimalConfig = (id: string): ReportViewConfig => ({
  id,
  title: { en: 'X' },
  subtitleSecondary: { en: '' },
  breadcrumb: { en: 'X' },
  section: { en: 'main' },
  hubCard: { icon: 'trending-up', description: { en: 'X' } },
  topbar: { periodPicker: 'month', exportButton: false },
  loader: async () => ({ kpis: [], sections: [] }),
});

describe('report-view DSL', () => {
  beforeEach(() => clearReportRegistry());

  it('registers a view by id', () => {
    defineReportView(minimalConfig('a'));
    expect(getReportRegistry().views.get('a')).toBeDefined();
  });

  it('replaces on duplicate id (HMR-safe)', () => {
    defineReportView(minimalConfig('dup'));
    defineReportView({ ...minimalConfig('dup'), subtitleSecondary: { en: 'replaced' } });
    expect(getReportRegistry().views.get('dup')?.subtitleSecondary).toEqual({ en: 'replaced' });
  });

  it('stores order config and returns it from getReportRegistry', () => {
    defineReportOrder(['gross-profit', 'aging']);
    expect(getReportRegistry().order).toEqual(['gross-profit', 'aging']);
  });

  it('clearReportRegistry resets both views and order', () => {
    defineReportView(minimalConfig('a'));
    defineReportOrder(['a']);
    clearReportRegistry();
    expect(getReportRegistry().views.size).toBe(0);
    expect(getReportRegistry().order).toBeNull();
  });
});
