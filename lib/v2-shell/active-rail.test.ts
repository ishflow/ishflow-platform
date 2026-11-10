import { describe, expect, it } from 'vitest';
import { activeRailFromPath } from './active-rail';

describe('activeRailFromPath', () => {
  it('returns "dashboard" for /v2/dashboard', () => {
    expect(activeRailFromPath('/dashboard')).toBe('dashboard');
  });
  it('returns "dashboard" for /tr/v2/dashboard', () => {
    expect(activeRailFromPath('/tr/v2/dashboard')).toBe('dashboard');
  });
  it('returns "catalogs" for /v2/catalogs/products', () => {
    expect(activeRailFromPath('/catalogs/products')).toBe('catalogs');
  });
  it('returns "documents" for /v2/documents/sales-invoice/new', () => {
    expect(activeRailFromPath('/documents/sales-invoice/new')).toBe('documents');
  });
  it('returns "reports" for /tr/v2/reports/gross-profit', () => {
    expect(activeRailFromPath('/tr/v2/reports/gross-profit')).toBe('reports');
  });
  it('returns "dashboard" as fallback for /v2 root', () => {
    expect(activeRailFromPath('/')).toBe('dashboard');
  });
  it('returns "dashboard" as fallback for unknown segment', () => {
    expect(activeRailFromPath('/unknown-segment')).toBe('dashboard');
  });

  it('still returns "admin" for other /admin pages', () => {
    expect(activeRailFromPath('/admin/members')).toBe('admin');
    expect(activeRailFromPath('/admin/roles')).toBe('admin');
    expect(activeRailFromPath('/tr/admin/audit')).toBe('admin');
  });
});
