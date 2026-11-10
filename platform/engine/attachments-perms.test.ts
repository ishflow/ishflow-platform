import { SYSTEM_ROLE_DEFS } from '@/platform/auth/seed-system-roles';
import { clearRegistry, defineDocument, field } from '@/platform/metadata';
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
  for (const [module, name] of [
    ['sales', 'invoice'],
    ['sales', 'payment_received'],
    ['purchases', 'invoice'],
    ['purchases', 'payment_sent'],
  ] as const) {
    defineDocument({
      module,
      name,
      label: { en: `${module} ${name}` },
      header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
      posting: {},
      permissions: { read: 'any', write: 'any' },
    });
  }
});

/**
 * Matrix: which roles may write each of the four core document entities.
 *
 * Derived directly from SYSTEM_ROLE_DEFS — no production code is altered.
 * The purpose is to lock in the contract that attachment write is inherited
 * from the parent document's write permission (no separate attachment:write
 * scope is required by `assertEntityAccess`).
 */
describe('attachment permission inheritance', () => {
  // [role, entity]
  const WRITE_ALLOWED: Array<[keyof typeof SYSTEM_ROLE_DEFS, string]> = [
    // owner — *:* wildcard covers all
    ['owner', 'document.sales.invoice'],
    ['owner', 'document.sales.payment_received'],
    ['owner', 'document.purchases.invoice'],
    ['owner', 'document.purchases.payment_sent'],
    // admin — *:* wildcard covers all
    ['admin', 'document.sales.invoice'],
    ['admin', 'document.sales.payment_received'],
    ['admin', 'document.purchases.invoice'],
    ['admin', 'document.purchases.payment_sent'],
    // chief_accountant — explicit write on all four
    ['chief_accountant', 'document.sales.invoice'],
    ['chief_accountant', 'document.sales.payment_received'],
    ['chief_accountant', 'document.purchases.invoice'],
    ['chief_accountant', 'document.purchases.payment_sent'],
    // bookkeeper — explicit write on all four
    ['bookkeeper', 'document.sales.invoice'],
    ['bookkeeper', 'document.sales.payment_received'],
    ['bookkeeper', 'document.purchases.invoice'],
    ['bookkeeper', 'document.purchases.payment_sent'],
    // cashier — write on payments only, not invoices
    ['cashier', 'document.sales.payment_received'],
    ['cashier', 'document.purchases.payment_sent'],
    // sales — write on sales docs only
    ['sales', 'document.sales.invoice'],
    ['sales', 'document.sales.payment_received'],
    // buyer — write on purchase docs only
    ['buyer', 'document.purchases.invoice'],
    ['buyer', 'document.purchases.payment_sent'],
  ];

  const WRITE_DENIED: Array<[keyof typeof SYSTEM_ROLE_DEFS, string]> = [
    // cashier — no write on invoices
    ['cashier', 'document.sales.invoice'],
    ['cashier', 'document.purchases.invoice'],
    // sales — no write on purchase docs
    ['sales', 'document.purchases.invoice'],
    ['sales', 'document.purchases.payment_sent'],
    // buyer — no write on sales docs
    ['buyer', 'document.sales.invoice'],
    ['buyer', 'document.sales.payment_received'],
    // warehouse — no financial write at all
    ['warehouse', 'document.sales.invoice'],
    ['warehouse', 'document.sales.payment_received'],
    ['warehouse', 'document.purchases.invoice'],
    ['warehouse', 'document.purchases.payment_sent'],
    // viewer — read-only
    ['viewer', 'document.sales.invoice'],
    ['viewer', 'document.sales.payment_received'],
    ['viewer', 'document.purchases.invoice'],
    ['viewer', 'document.purchases.payment_sent'],
  ];

  it.each(WRITE_ALLOWED)('role=%s entity=%s → write ALLOWED', (role, entity) => {
    const ctx = ctxWith(SYSTEM_ROLE_DEFS[role].permissions);
    expect(() => assertEntityAccess(ctx, entity, 'write')).not.toThrow();
  });

  it.each(WRITE_DENIED)('role=%s entity=%s → write DENIED', (role, entity) => {
    const ctx = ctxWith(SYSTEM_ROLE_DEFS[role].permissions);
    expect(() => assertEntityAccess(ctx, entity, 'write')).toThrow(PermissionDeniedError);
  });
});
