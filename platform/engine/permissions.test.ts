import type { AppContext } from '@/platform/auth/current-context';
import type { CatalogConfig, DocumentConfig } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { PermissionDeniedError } from './errors';
import { check, derivedCode, hasPermission } from './permissions';

function ctxWith(perms: string[]): AppContext {
  return {
    user: { id: 'u' } as never,
    tenant: { id: 't' } as never,
    membership: { id: 'm' } as never,
    permissions: new Set(perms),
    scopesByEntity: new Map(),
    addons: new Set(),
  };
}

const CATALOG: CatalogConfig = {
  id: 'sales.customer',
  module: 'sales',
  name: 'customer',
  label: { en: 'Customer' },
  fields: {},
  permissions: {},
};

const DOC: DocumentConfig = {
  id: 'sales.invoice',
  module: 'sales',
  name: 'invoice',
  label: { en: 'Invoice' },
  header: {},
  posting: {},
  permissions: {},
};

describe('derivedCode', () => {
  it.each([
    ['read', 'sales.customer:read'],
    ['create', 'sales.customer:write'],
    ['update', 'sales.customer:write'],
    ['delete', 'sales.customer:delete'],
    ['post', 'sales.customer:post'],
    ['unpost', 'sales.customer:unpost'],
  ] as const)('maps %s → %s', (op, expected) => {
    expect(derivedCode(CATALOG, op)).toBe(expected);
  });
});

describe('hasPermission (wildcard walk)', () => {
  it('exact match', () => {
    expect(hasPermission(new Set(['sales.customer:read']), 'sales.customer:read')).toBe(true);
  });
  it('entity wildcard', () => {
    expect(hasPermission(new Set(['sales.customer:*']), 'sales.customer:read')).toBe(true);
  });
  it('module wildcard', () => {
    expect(hasPermission(new Set(['sales.*:read']), 'sales.customer:read')).toBe(true);
    expect(hasPermission(new Set(['sales.*:*']), 'sales.customer:post')).toBe(true);
  });
  it('action wildcard', () => {
    expect(hasPermission(new Set(['*:read']), 'sales.customer:read')).toBe(true);
  });
  it('global wildcard', () => {
    expect(hasPermission(new Set(['*:*']), 'anything.else:post')).toBe(true);
  });
  it('no match', () => {
    expect(hasPermission(new Set(['sales.customer:read']), 'sales.customer:post')).toBe(false);
  });
  it('*:* does NOT grant owner:tenant_delete (sealed namespace)', () => {
    expect(hasPermission(new Set(['*:*']), 'owner:tenant_delete')).toBe(false);
  });
  it('*:* does NOT grant admin.billing:manage (sealed namespace)', () => {
    expect(hasPermission(new Set(['*:*']), 'admin.billing:manage')).toBe(false);
  });
  it('explicit owner:tenant_delete in permissions DOES grant it', () => {
    expect(hasPermission(new Set(['*:*', 'owner:tenant_delete']), 'owner:tenant_delete')).toBe(
      true,
    );
  });
  it('*:* still grants sales.invoice:write', () => {
    expect(hasPermission(new Set(['*:*']), 'sales.invoice:write')).toBe(true);
  });
  it('admin.audit is sealed — *:* does NOT pierce it (owner/admin hold it explicitly)', () => {
    expect(hasPermission(new Set(['*:*']), 'admin.audit:read')).toBe(false);
    expect(hasPermission(new Set(['*:*', 'admin.audit:read']), 'admin.audit:read')).toBe(true);
  });
  it('*:read (viewer) cannot reach the sealed audit log', () => {
    expect(hasPermission(new Set(['*:read']), 'admin.audit:read')).toBe(false);
  });
});

describe('check', () => {
  it('derived: user holding permission passes', () => {
    expect(() => check(ctxWith(['sales.customer:read']), CATALOG, 'read')).not.toThrow();
  });
  it('derived: user without permission denied', () => {
    expect(() => check(ctxWith([]), CATALOG, 'read')).toThrow(PermissionDeniedError);
  });
  it('rule=any bypasses check', () => {
    const cfg = { ...CATALOG, permissions: { read: 'any' as const } };
    expect(() => check(ctxWith([]), cfg, 'read')).not.toThrow();
  });
  it('rule=none denies even when user has permission', () => {
    const cfg = { ...CATALOG, permissions: { delete: 'none' as const } };
    expect(() => check(ctxWith(['sales.customer:delete']), cfg, 'delete')).toThrow(
      PermissionDeniedError,
    );
  });
  it('document post requires post permission', () => {
    expect(() => check(ctxWith(['sales.invoice:read']), DOC, 'post')).toThrow(
      PermissionDeniedError,
    );
    expect(() => check(ctxWith(['sales.invoice:post']), DOC, 'post')).not.toThrow();
  });
  it('wildcard *:* grants every op on every entity', () => {
    expect(() => check(ctxWith(['*:*']), CATALOG, 'delete')).not.toThrow();
    expect(() => check(ctxWith(['*:*']), DOC, 'unpost')).not.toThrow();
  });
});

describe('SEALED_NAMESPACES — reports', () => {
  it('blocks *:read wildcard from granting reports:read', () => {
    const granted = new Set(['*:read']);
    expect(hasPermission(granted, 'reports:read')).toBe(false);
  });

  it('blocks *:* wildcard from granting reports:read', () => {
    const granted = new Set(['*:*']);
    expect(hasPermission(granted, 'reports:read')).toBe(false);
  });

  it('grants reports:read when granted explicitly', () => {
    const granted = new Set(['reports:read']);
    expect(hasPermission(granted, 'reports:read')).toBe(true);
  });

  it('grants reports:read via reports:* explicit grant', () => {
    const granted = new Set(['reports:*']);
    expect(hasPermission(granted, 'reports:read')).toBe(true);
  });

  it('blocks module-wildcard sales.*:* from granting reports:read', () => {
    const granted = new Set(['sales.*:*']);
    expect(hasPermission(granted, 'reports:read')).toBe(false);
  });

  it('blocks *:* from granting reports.sub:read (sub-namespace seal)', () => {
    const granted = new Set(['*:*']);
    expect(hasPermission(granted, 'reports.daily:read')).toBe(false);
  });

  it('blocks *:read from granting admin.billing:manage (sealed admin namespace, widened seal regression guard)', () => {
    const granted = new Set(['*:read']);
    expect(hasPermission(granted, 'admin.billing:manage')).toBe(false);
  });
});
