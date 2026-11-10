/**
 * Smoke tests: prove the mobile catalog + document list endpoints honor
 * `assignedRepId` (sales) / `assignedBuyerId` (buyer) row-level scopes.
 *
 * The engine has unit tests for `scopeWhere` (`platform/engine/scopes.test.ts`)
 * that exercise the helper in isolation. These tests pin the wiring at the
 * *route* level — i.e. they prove that:
 *
 *   1. The route forwards the AppContext returned by `requireTenantContext`
 *      to the engine UNMODIFIED (no scope stripping, no permission widening).
 *   2. Therefore `scopeWhere(forwardedCtx, config, 'read')` — which is what
 *      `listRecordsPaged` / `listDocumentsPaged` already invoke internally —
 *      produces the expected deny-foreign-rows clause.
 *
 * If a future refactor of the route handler bypasses the engine, swaps the
 * helper, or drops `scopesByEntity` before forwarding, the captured-ctx
 * assertions below fire.
 *
 * The response-iteration block ("no foreign owner in items") is a trivially
 * true no-op when the mocked engine returns an empty rows array; it exists
 * as documentation of intent and as a regression fence for any future shape
 * change that wraps/transforms the engine output.
 */
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/accounts-receivable';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const REP_USER = 'user-rep-1';
const BUYER_USER = 'user-buyer-1';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const mockedAuth = vi.hoisted(() => ({
  // Mutated per-test via `setMockedCtx(...)` to swap user + scope.
  ctxBuilder: (): unknown => ({
    user: { id: REP_USER, clerkId: `clerk_${REP_USER}` },
    tenant: { id: TENANT_ID, name: 'Test', slug: 'test', currency: 'USD' },
    membership: { id: 'm1', tenantId: TENANT_ID, userId: REP_USER },
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map(),
  }),
}));

const mockedEngine = vi.hoisted(() => ({
  listRecordsPaged: vi.fn(),
  registerBalanceGrouped: vi.fn(),
  listDocumentsPaged: vi.fn(),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => mockedAuth.ctxBuilder(),
}));

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<typeof import('@/platform/engine')>('@/platform/engine');
  return {
    ...actual,
    listRecordsPaged: mockedEngine.listRecordsPaged,
    registerBalanceGrouped: mockedEngine.registerBalanceGrouped,
    listDocumentsPaged: mockedEngine.listDocumentsPaged,
  };
});

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T,>(_tenantId: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  withBypass: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({}),
}));

import type { AppContext } from '@/platform/auth/current-context';
import { scopeWhere } from '@/platform/engine/scopes';
import { getRegistry } from '@/platform/metadata';
import { GET as getCounterparties } from '../counterparties/route';
import { GET as getDocuments } from '../documents/[type]/route';

type ScopedCtxOpts = {
  userId: string;
  entity: string;
  field: string;
};

/**
 * Build an AppContext that mirrors the production shape from
 * `platform/auth/current-context.ts` (Set permissions, Map scopesByEntity,
 * RoleScopeGroup[] per entity).
 */
function buildScopedCtx(opts: ScopedCtxOpts): unknown {
  const scopesByEntity = new Map<string, Array<{ roleId: string; rules: Array<{ entityId: string; field: string; operator: 'currentUser'; value: null }> }>>([
    [
      opts.entity,
      [
        {
          roleId: 'role-under-test',
          rules: [
            {
              entityId: opts.entity,
              field: opts.field,
              operator: 'currentUser',
              value: null,
            },
          ],
        },
      ],
    ],
  ]);
  return {
    user: { id: opts.userId, clerkId: `clerk_${opts.userId}` },
    tenant: { id: TENANT_ID, name: 'Test', slug: 'test', currency: 'USD' },
    membership: { id: 'm1', tenantId: TENANT_ID, userId: opts.userId },
    // Empty permissions Set + entity-scoped read on the catalog/doc under
    // test. All four configs declare `read: 'any'`, so the route's `check()`
    // pass-through doesn't need wildcard perms — entry through `scopeWhere`
    // is what we're pinning.
    permissions: new Set<string>(),
    scopesByEntity,
  };
}

function setMockedCtx(opts: ScopedCtxOpts): void {
  mockedAuth.ctxBuilder = () => buildScopedCtx(opts);
}

describe('mobile route → engine scope wiring', () => {
  beforeEach(() => {
    mockedEngine.listRecordsPaged.mockReset();
    mockedEngine.registerBalanceGrouped.mockReset();
    mockedEngine.listDocumentsPaged.mockReset();
    // Default: empty result set; specific tests can override.
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
    mockedEngine.listDocumentsPaged.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
    mockedEngine.registerBalanceGrouped.mockResolvedValue([]);
  });

  it('sales user → /counterparties?type=customer forwards assignedRepId scope', async () => {
    setMockedCtx({ userId: REP_USER, entity: 'sales.customer', field: 'assignedRepId' });

    const res = await getCounterparties(
      new Request('http://localhost/api/mobile/counterparties?type=customer'),
    );
    expect(res.status).toBe(200);

    // The route MUST hand the engine the same ctx requireTenantContext
    // returned. Capture it and re-run scopeWhere ourselves to prove the
    // deny-foreign-rows clause is in play.
    expect(mockedEngine.listRecordsPaged).toHaveBeenCalledTimes(1);
    const call = mockedEngine.listRecordsPaged.mock.calls[0];
    if (!call) throw new Error('listRecordsPaged was not called');
    const [forwardedCtx, forwardedConfig] = call;
    const customerConfig = getRegistry().catalog['sales.customer'];
    if (!customerConfig) throw new Error('sales.customer config missing');
    expect((forwardedConfig as { id: string }).id).toBe('sales.customer');
    const where = scopeWhere(forwardedCtx as AppContext, customerConfig, 'read');
    expect(where).toEqual({ assignedRepId: REP_USER });

    // Items array trivially has no foreign owners (engine mock returns []).
    // The loop is a documented no-op — its presence pins the response shape.
    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    for (const item of body.items) {
      const owner = (item as { assignedRepId?: string }).assignedRepId;
      if (owner !== undefined) {
        expect(owner, `cross-rep leak: ${JSON.stringify(item)}`).toBe(REP_USER);
      }
    }
  });

  it('sales user → /documents/sales.invoice forwards assignedRepId scope', async () => {
    setMockedCtx({ userId: REP_USER, entity: 'sales.invoice', field: 'assignedRepId' });

    const res = await getDocuments(
      new Request('http://localhost/api/mobile/documents/sales.invoice'),
      { params: Promise.resolve({ type: 'sales.invoice' }) },
    );
    expect(res.status).toBe(200);

    expect(mockedEngine.listDocumentsPaged).toHaveBeenCalledTimes(1);
    const call = mockedEngine.listDocumentsPaged.mock.calls[0];
    if (!call) throw new Error('listDocumentsPaged was not called');
    const [forwardedCtx, forwardedConfig] = call;
    const invoiceConfig = getRegistry().document['sales.invoice'];
    if (!invoiceConfig) throw new Error('sales.invoice config missing');
    expect((forwardedConfig as { id: string }).id).toBe('sales.invoice');
    const where = scopeWhere(forwardedCtx as AppContext, invoiceConfig, 'read');
    expect(where).toEqual({ assignedRepId: REP_USER });

    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    for (const item of body.items) {
      const owner = (item as { assignedRepId?: string }).assignedRepId;
      if (owner !== undefined) {
        expect(owner, `cross-rep leak: ${JSON.stringify(item)}`).toBe(REP_USER);
      }
    }
  });

  it('buyer user → /counterparties?type=supplier forwards assignedBuyerId scope', async () => {
    setMockedCtx({
      userId: BUYER_USER,
      entity: 'purchases.supplier',
      field: 'assignedBuyerId',
    });

    const res = await getCounterparties(
      new Request('http://localhost/api/mobile/counterparties?type=supplier'),
    );
    expect(res.status).toBe(200);

    expect(mockedEngine.listRecordsPaged).toHaveBeenCalledTimes(1);
    const call = mockedEngine.listRecordsPaged.mock.calls[0];
    if (!call) throw new Error('listRecordsPaged was not called');
    const [forwardedCtx, forwardedConfig] = call;
    const supplierConfig = getRegistry().catalog['purchases.supplier'];
    if (!supplierConfig) throw new Error('purchases.supplier config missing');
    expect((forwardedConfig as { id: string }).id).toBe('purchases.supplier');
    const where = scopeWhere(forwardedCtx as AppContext, supplierConfig, 'read');
    expect(where).toEqual({ assignedBuyerId: BUYER_USER });

    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    for (const item of body.items) {
      const owner = (item as { assignedBuyerId?: string }).assignedBuyerId;
      if (owner !== undefined) {
        expect(owner, `cross-buyer leak: ${JSON.stringify(item)}`).toBe(BUYER_USER);
      }
    }
  });

  it('buyer user → /documents/purchases.invoice forwards assignedBuyerId scope', async () => {
    setMockedCtx({
      userId: BUYER_USER,
      entity: 'purchases.invoice',
      field: 'assignedBuyerId',
    });

    const res = await getDocuments(
      new Request('http://localhost/api/mobile/documents/purchases.invoice'),
      { params: Promise.resolve({ type: 'purchases.invoice' }) },
    );
    expect(res.status).toBe(200);

    expect(mockedEngine.listDocumentsPaged).toHaveBeenCalledTimes(1);
    const call = mockedEngine.listDocumentsPaged.mock.calls[0];
    if (!call) throw new Error('listDocumentsPaged was not called');
    const [forwardedCtx, forwardedConfig] = call;
    const purchaseInvoiceConfig = getRegistry().document['purchases.invoice'];
    if (!purchaseInvoiceConfig) throw new Error('purchases.invoice config missing');
    expect((forwardedConfig as { id: string }).id).toBe('purchases.invoice');
    const where = scopeWhere(forwardedCtx as AppContext, purchaseInvoiceConfig, 'read');
    expect(where).toEqual({ assignedBuyerId: BUYER_USER });

    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    for (const item of body.items) {
      const owner = (item as { assignedBuyerId?: string }).assignedBuyerId;
      if (owner !== undefined) {
        expect(owner, `cross-buyer leak: ${JSON.stringify(item)}`).toBe(BUYER_USER);
      }
    }
  });
});
