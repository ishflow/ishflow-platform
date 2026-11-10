import { describe, expect, it } from 'vitest';
import { shouldPinTab } from './tab-policy';

describe('shouldPinTab', () => {
  it('returns false for rail root paths', () => {
    expect(shouldPinTab('/dashboard')).toBe(false);
    expect(shouldPinTab('/catalogs/products')).toBe(false);
    expect(shouldPinTab('/documents/sales-invoice')).toBe(false);
    expect(shouldPinTab('/registers/accounts_receivable')).toBe(false);
    expect(shouldPinTab('/settings')).toBe(false);
    expect(shouldPinTab('/admin/members')).toBe(false);
  });

  it('returns false for detail paths', () => {
    expect(shouldPinTab('/documents/sales-invoice/INV-001')).toBe(false);
    expect(shouldPinTab('/catalogs/products/abc-123')).toBe(false);
    expect(shouldPinTab('/admin/roles/xyz')).toBe(false);
  });

  it('returns true for /new paths', () => {
    expect(shouldPinTab('/catalogs/products/new')).toBe(true);
    expect(shouldPinTab('/catalogs/customers/new')).toBe(true);
    expect(shouldPinTab('/documents/sales-invoice/new')).toBe(true);
    expect(shouldPinTab('/purchases/purchase-invoice/new')).toBe(true);
  });

  it('returns true for /invite paths', () => {
    expect(shouldPinTab('/admin/members/invite')).toBe(true);
  });

  it('returns true for /quick paths', () => {
    expect(shouldPinTab('/purchases/purchase-invoice/quick')).toBe(true);
  });

  it('strips trailing slash before matching', () => {
    expect(shouldPinTab('/catalogs/products/new/')).toBe(true);
  });
});
