import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PERMISSIONS, listAllPermissions } from './permission-registry';

describe('permission-registry', () => {
  it('includes every SYSTEM_PERMISSIONS entry', () => {
    const all = listAllPermissions();
    for (const p of SYSTEM_PERMISSIONS) expect(all).toContain(p);
  });

  it('includes 8 owner-exclusive permissions', () => {
    const all = listAllPermissions();
    expect(all).toContain('owner:tenant_archive');
    expect(all).toContain('owner:tenant_delete');
    expect(all).toContain('owner:tenant_transfer');
    expect(all).toContain('owner:branding');
    expect(all).toContain('owner:legal_name_edit');
    expect(all).toContain('owner:remove_admin');
    expect(all).toContain('owner:assign_owner_role');
    expect(all).toContain('owner:export_full');
  });

  it('emits read/write/delete codes for registered catalog configs', () => {
    const all = listAllPermissions();
    expect(all).toContain('sales.customer:read');
    expect(all).toContain('sales.customer:write');
    expect(all).toContain('sales.customer:delete');
    expect(all).toContain('inventory.product:read');
  });

  it('emits read/write/delete/post/unpost for document configs', () => {
    const all = listAllPermissions();
    expect(all).toContain('sales.invoice:read');
    expect(all).toContain('sales.invoice:write');
    expect(all).toContain('sales.invoice:delete');
    expect(all).toContain('sales.invoice:post');
    expect(all).toContain('sales.invoice:unpost');
  });

  it('does not emit :post for catalog configs', () => {
    const all = listAllPermissions();
    expect(all).not.toContain('sales.customer:post');
    expect(all).not.toContain('inventory.product:post');
  });

  it('returns a sorted list', () => {
    const all = listAllPermissions();
    const copy = [...all].sort();
    expect(all).toEqual(copy);
  });
});
