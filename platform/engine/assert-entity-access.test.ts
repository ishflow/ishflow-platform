import { clearRegistry, defineCatalog, defineDocument, field } from '@/platform/metadata';
import { beforeEach, describe, expect, it } from 'vitest';
import { assertEntityAccess } from './attachments';
import { PermissionDeniedError } from './errors';

function ctxWith(permissions: string[]) {
  return {
    permissions: new Set(permissions),
  } as unknown as import('@/platform/auth/current-context').AppContext;
}

beforeEach(() => {
  clearRegistry();
  defineDocument({
    module: 'sales',
    name: 'invoice',
    label: { en: 'Invoice' },
    header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
    posting: {},
    permissions: { read: 'any', write: 'any' },
  });
  defineCatalog({
    module: 'inventory',
    name: 'product',
    label: { en: 'Product' },
    fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
    permissions: { read: 'any', write: 'any' },
  });
});

describe('assertEntityAccess', () => {
  it('passes for document read with matching permission', () => {
    expect(() =>
      assertEntityAccess(ctxWith(['sales.invoice:read']), 'document.sales.invoice', 'read'),
    ).not.toThrow();
  });

  it('passes for document write with wildcard', () => {
    expect(() =>
      assertEntityAccess(ctxWith(['*:*']), 'document.sales.invoice', 'write'),
    ).not.toThrow();
  });

  it('rejects document write without matching permission', () => {
    expect(() =>
      assertEntityAccess(ctxWith(['sales.invoice:read']), 'document.sales.invoice', 'write'),
    ).toThrow(PermissionDeniedError);
  });

  it('rejects forged entity that is not in the registry', () => {
    expect(() => assertEntityAccess(ctxWith(['*:*']), 'document.bogus.nope', 'read')).toThrow(
      PermissionDeniedError,
    );
  });

  it('rejects unknown kind prefixes', () => {
    expect(() => assertEntityAccess(ctxWith(['*:*']), 'widget.sales.invoice', 'read')).toThrow(
      PermissionDeniedError,
    );
  });

  it('supports catalog entities', () => {
    expect(() =>
      assertEntityAccess(ctxWith(['inventory.product:read']), 'catalog.inventory.product', 'read'),
    ).not.toThrow();
  });
});
