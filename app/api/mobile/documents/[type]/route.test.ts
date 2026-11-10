import { describe, expect, it, vi, beforeEach } from 'vitest';

/** Helper type for the third argument passed to `listDocumentsPaged`. */
interface ListDocumentsPagedArg {
  where?: {
    date?: { gte?: Date; lte?: Date };
    customerId?: { in: string[] };
    supplierId?: { in: string[] };
    items?: { some: { productId: { in: string[] } } };
  } & Record<string, unknown>;
}

const listDocumentsPagedMock = vi.fn();
const requireTenantContextMock = vi.fn();

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: () => requireTenantContextMock(),
}));

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/platform/engine');
  return {
    ...actual,
    listDocumentsPaged: (...args: unknown[]) => listDocumentsPagedMock(...args),
    resolveIdempotency: vi.fn().mockResolvedValue(null),
    storeIdempotency: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/platform/engine/document-list-enrich', () => ({
  enrichDocumentListRows: async (_app: unknown, _cfg: unknown, rows: unknown[]) => rows,
}));

import { GET, POST } from './route';

const createDocumentMock = vi.fn();

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/platform/engine');
  return {
    ...actual,
    listDocumentsPaged: (...args: unknown[]) => listDocumentsPagedMock(...args),
    createDocument: (...args: unknown[]) => createDocumentMock(...args),
    resolveIdempotency: vi.fn().mockResolvedValue(null),
    storeIdempotency: vi.fn().mockResolvedValue(undefined),
  };
});

const fakeApp = { tenant: { id: 't1' } };

function makeReq(qs: string): Request {
  return new Request(`http://t/api/mobile/documents/sales.invoice?${qs}`);
}

const fakeParams = { params: Promise.resolve({ type: 'sales.invoice' }) };

const withTenantMock = vi.fn();

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: (...args: unknown[]) => withTenantMock(...args),
}));

beforeEach(() => {
  listDocumentsPagedMock.mockReset();
  createDocumentMock.mockReset();
  withTenantMock.mockReset();
  requireTenantContextMock.mockReset();
  requireTenantContextMock.mockResolvedValue(fakeApp);
  listDocumentsPagedMock.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50 });
});

describe('mobile documents GET — filter wiring', () => {
  it('rejects unknown type', async () => {
    const res = await GET(makeReq(''), {
      params: Promise.resolve({ type: 'nope.nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    requireTenantContextMock.mockRejectedValueOnce(new Error('UNAUTH'));
    const res = await GET(makeReq(''), fakeParams);
    expect(res.status).toBe(401);
  });

  it('passes no where when no filter params present', async () => {
    const res = await GET(makeReq(''), fakeParams);
    expect(res.status).toBe(200);
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeUndefined();
  });

  it('translates from/to into a date range on header.date', async () => {
    await GET(makeReq('from=2026-01-01&to=2026-01-31'), fakeParams);
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeDefined();
    expect(arg.where!.date!.gte).toEqual(new Date('2026-01-01'));
    const expectedEnd = new Date('2026-01-31');
    expectedEnd.setUTCHours(23, 59, 59, 999);
    expect(arg.where!.date!.lte).toEqual(expectedEnd);
  });

  it('translates customerIds CSV into customerId IN', async () => {
    await GET(
      makeReq(
        'customerIds=00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002',
      ),
      fakeParams,
    );
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeDefined();
    expect(arg.where!.customerId).toEqual({
      in: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ],
    });
  });

  it('translates productIds CSV into a lines.some predicate', async () => {
    await GET(
      makeReq('productIds=00000000-0000-0000-0000-000000000abc'),
      fakeParams,
    );
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeDefined();
    expect(arg.where!.items).toEqual({
      some: { productId: { in: ['00000000-0000-0000-0000-000000000abc'] } },
    });
  });

  it('drops customerIds for purchases.invoice (no customer header field)', async () => {
    await GET(
      new Request(
        'http://t/api/mobile/documents/purchases.invoice?customerIds=00000000-0000-0000-0000-000000000001',
      ),
      { params: Promise.resolve({ type: 'purchases.invoice' }) },
    );
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeUndefined();
  });

  it('drops supplierIds for sales.invoice (no supplier header field)', async () => {
    await GET(
      makeReq('supplierIds=00000000-0000-0000-0000-000000000001'),
      fakeParams,
    );
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeUndefined();
  });

  it('rejects malformed UUID in customerIds with 400', async () => {
    const res = await GET(makeReq('customerIds=not-a-uuid'), fakeParams);
    expect(res.status).toBe(400);
  });

  it('combines from/to + customerIds in one where', async () => {
    await GET(
      makeReq(
        'from=2026-01-01&to=2026-01-31&customerIds=00000000-0000-0000-0000-000000000001',
      ),
      fakeParams,
    );
    const arg = listDocumentsPagedMock.mock.calls[0]![2]! as ListDocumentsPagedArg;
    expect(arg.where).toBeDefined();
    expect(arg.where!).toMatchObject({
      date: { gte: expect.any(Date), lte: expect.any(Date) },
      customerId: { in: ['00000000-0000-0000-0000-000000000001'] },
    });
  });

  it('redacts financial fields for warehouse role', async () => {
    requireTenantContextMock.mockResolvedValue({
      tenant: { id: 't1' },
      permissions: new Set(['inventory.warehouse_stock:read', 'sales.invoice:read']),
      membership: { roles: [{ name: 'warehouse' }] },
      scopesByEntity: new Map(),
    });
    listDocumentsPagedMock.mockResolvedValue({
      rows: [
        { id: 'd1', total: 1000, unitPrice: 50, lines: [{ productId: 'p1', quantity: 2, unitPrice: 50, lineTotal: 100 }] },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    const res = await GET(makeReq(''), fakeParams);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0]).not.toHaveProperty('total');
    expect(body.items[0]).not.toHaveProperty('unitPrice');
    expect(body.items[0].lines[0]).not.toHaveProperty('unitPrice');
    expect(body.items[0].lines[0]).not.toHaveProperty('lineTotal');
  });

  it('does not redact for bookkeeper role', async () => {
    requireTenantContextMock.mockResolvedValue({
      tenant: { id: 't1' },
      permissions: new Set(['sales.invoice:read', 'sales.invoice:write']),
      membership: { roles: [{ name: 'bookkeeper' }] },
      scopesByEntity: new Map(),
    });
    listDocumentsPagedMock.mockResolvedValue({
      rows: [
        { id: 'd1', total: 1000, unitPrice: 50, lines: [{ productId: 'p1', quantity: 2, unitPrice: 50, lineTotal: 100 }] },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    const res = await GET(makeReq(''), fakeParams);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0]).toHaveProperty('total', 1000);
    expect(body.items[0]).toHaveProperty('unitPrice', 50);
    expect(body.items[0].lines[0]).toHaveProperty('unitPrice', 50);
    expect(body.items[0].lines[0]).toHaveProperty('lineTotal', 100);
  });
});

describe('POST /api/mobile/documents/[type] rebind attachments', () => {
  it('rebinds attachments with attachmentDraftId to the new doc id', async () => {
    requireTenantContextMock.mockResolvedValue({
      tenant: { id: 't1' },
      permissions: ['purchases.invoice:write'],
    });
    createDocumentMock.mockResolvedValue({
      id: 'real-doc-id',
      lines: [],
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    withTenantMock.mockImplementation(async (_id, fn) =>
      fn({ attachment: { updateMany } }),
    );

    const body = JSON.stringify({
      date: '2026-05-03',
      supplier: '00000000-0000-0000-0000-000000000010',
      warehouse: '00000000-0000-0000-0000-000000000011',
      status: 'SAVED',
      lines: [],
      attachmentDraftId: '00000000-0000-0000-0000-000000000099',
    });
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/json', 'Idempotency-Key': 'test-key' },
      }),
      { params: Promise.resolve({ type: 'purchases.invoice' }) },
    );

    expect(res.status).toBe(201);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        entity: 'document.purchases.invoice',
        entityId: '00000000-0000-0000-0000-000000000099',
      },
      data: { entityId: 'real-doc-id' },
    });
    // attachmentDraftId payload'da kalmamalı (engine bilmiyor)
    expect(createDocumentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.not.objectContaining({ attachmentDraftId: expect.anything() }),
    );
  });

  it('skips rebind when attachmentDraftId absent', async () => {
    requireTenantContextMock.mockResolvedValue({
      tenant: { id: 't1' },
      permissions: ['purchases.invoice:write'],
    });
    createDocumentMock.mockResolvedValue({ id: 'doc2', lines: [] });
    const updateMany = vi.fn();
    withTenantMock.mockImplementation(async (_id, fn) =>
      fn({ attachment: { updateMany } }),
    );

    const body = JSON.stringify({
      date: '2026-05-03',
      supplier: '00000000-0000-0000-0000-000000000010',
      warehouse: '00000000-0000-0000-0000-000000000011',
      status: 'SAVED',
      lines: [],
    });
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/json', 'Idempotency-Key': 'k2' },
      }),
      { params: Promise.resolve({ type: 'purchases.invoice' }) },
    );
    expect(res.status).toBe(201);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
