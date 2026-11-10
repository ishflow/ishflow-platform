import { describe, expect, it } from 'vitest';
import { scopeToPermissions } from './permissions';

describe('scopeToPermissions', () => {
  it('returns a Set<string> for both scopes', () => {
    const read = scopeToPermissions('read');
    const write = scopeToPermissions('write');
    expect(read).toBeInstanceOf(Set);
    expect(write).toBeInstanceOf(Set);
    for (const v of read) expect(typeof v).toBe('string');
    for (const v of write) expect(typeof v).toBe('string');
  });

  it('read scope is a subset of write scope', () => {
    const read = scopeToPermissions('read');
    const write = scopeToPermissions('write');
    for (const perm of read) {
      expect(write.has(perm)).toBe(true);
    }
  });

  it('excludes admin.* and super_admin.* namespaces in both scopes', () => {
    const read = scopeToPermissions('read');
    const write = scopeToPermissions('write');

    // Known admin permissions that exist in SYSTEM_ROLE_DEFS and would
    // otherwise match action filters.
    expect(read.has('admin.audit:read')).toBe(false);
    expect(read.has('admin.billing:manage')).toBe(false);
    expect(read.has('admin.organization:edit')).toBe(false);

    expect(write.has('admin.audit:read')).toBe(false);
    expect(write.has('admin.billing:manage')).toBe(false);
    expect(write.has('admin.organization:edit')).toBe(false);
    expect(write.has('admin.organization:delete')).toBe(false);

    // Defensive: no permission in either set should start with admin. /
    // super_admin. / super-admin.
    for (const perm of read) {
      const entity = perm.split(':')[0] ?? '';
      expect(entity.startsWith('admin.')).toBe(false);
      expect(entity.startsWith('super_admin.')).toBe(false);
      expect(entity.startsWith('super-admin.')).toBe(false);
    }
    for (const perm of write) {
      const entity = perm.split(':')[0] ?? '';
      expect(entity.startsWith('admin.')).toBe(false);
      expect(entity.startsWith('super_admin.')).toBe(false);
      expect(entity.startsWith('super-admin.')).toBe(false);
    }
  });

  it('read scope contains known read permissions and excludes write-like ones', () => {
    const read = scopeToPermissions('read');
    // `sales.invoice:read` is held by cashier/sales/etc. — concrete read
    // permission in the catalog.
    expect(read.has('sales.invoice:read')).toBe(true);
    // Write/post actions must not appear in the read set.
    expect(read.has('sales.invoice:write')).toBe(false);
    expect(read.has('sales.invoice:post')).toBe(false);
  });

  it('write scope strictly extends read scope and contains write-like permissions', () => {
    const read = scopeToPermissions('read');
    const write = scopeToPermissions('write');
    expect(write.size).toBeGreaterThan(read.size);

    // Concrete write/post permissions from SYSTEM_ROLE_DEFS.
    expect(write.has('sales.invoice:write')).toBe(true);
    expect(write.has('sales.invoice:post')).toBe(true);
    expect(write.has('purchases.payment_sent:unpost')).toBe(true);
    expect(write.has('inventory.warehouse_stock:write')).toBe(true);

    // Read permissions still present.
    expect(write.has('sales.invoice:read')).toBe(true);
  });

  it('never contains wildcard tokens', () => {
    const read = scopeToPermissions('read');
    const write = scopeToPermissions('write');
    for (const perm of read) {
      expect(perm).not.toContain('*');
    }
    for (const perm of write) {
      expect(perm).not.toContain('*');
    }
  });

  it('returns an independent Set on every call', () => {
    const a = scopeToPermissions('read');
    const b = scopeToPermissions('read');
    expect(a).not.toBe(b);
    const sizeBefore = b.size;
    a.add('synthetic.fake:read');
    a.clear();
    expect(b.size).toBe(sizeBefore);
    expect(b.has('sales.invoice:read')).toBe(true);
  });
});
