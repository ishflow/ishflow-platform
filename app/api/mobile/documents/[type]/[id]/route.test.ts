import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => ({
    tenant: { id: 'test-tenant' },
    user: { id: 'test-user' },
    permissions: new Set(['sales.invoice:write']),
  }),
}));

vi.mock('@/platform/engine', () => ({
  getDocument: vi.fn(),
}));

vi.mock('@/platform/engine/document-list-enrich', () => ({
  // Pass-through for tests: the route also asks the helper to embed refs
  // and compute totals, but those concerns are covered in the helper's own
  // test file. Here we only verify the line-normalization layer.
  enrichDocumentListRows: async (_app: unknown, _config: unknown, rows: unknown[]) => rows,
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async (_tenantId: string, fn: (tx: unknown) => unknown) => fn({}),
}));

import { getDocument } from '@/platform/engine';
import { GET } from './route';

describe('GET /api/mobile/documents/[type]/[id]', () => {
  async function call(): Promise<Response> {
    return GET(new Request('http://localhost/api/mobile/documents/sales.invoice/doc-1'), {
      params: Promise.resolve({ type: 'sales.invoice', id: 'doc-1' }),
    });
  }

  it('renames product/price/quantity to iOS shape and computes rowTotal', async () => {
    vi.mocked(getDocument).mockResolvedValueOnce({
      id: 'doc-1',
      number: 'INVOICE-000001',
      status: 'POSTED',
      lines: {
        items: [
          {
            id: 'line-1',
            product: 'prod-1',
            quantity: 2,
            price: '100.00',
          },
        ],
      },
    } as never);
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.lines)).toBe(true);
    expect(body.lines[0]).toMatchObject({
      id: 'line-1',
      productId: 'prod-1',
      quantity: '2.00',
      unitPrice: '100.00',
      rowTotal: '200.00',
    });
  });

  it('concatenates multiple sections in section order', async () => {
    vi.mocked(getDocument).mockResolvedValueOnce({
      id: 'doc-1',
      lines: {
        items: [{ id: 'item-1', product: 'p1', quantity: 1, price: '10' }],
        services: [
          { id: 'svc-1', product: 'p2', quantity: 1, price: '20' },
          { id: 'svc-2', product: 'p3', quantity: 1, price: '30' },
        ],
      },
    } as never);
    const body = await (await call()).json();
    expect(body.lines.map((l: { id: string }) => l.id)).toEqual([
      'item-1',
      'svc-1',
      'svc-2',
    ]);
  });

  it('emits an empty array when the section dict is empty', async () => {
    vi.mocked(getDocument).mockResolvedValueOnce({ id: 'doc-1', lines: {} } as never);
    const body = await (await call()).json();
    expect(body.lines).toEqual([]);
  });

  it('preserves an absent lines field as undefined', async () => {
    vi.mocked(getDocument).mockResolvedValueOnce({ id: 'doc-1' } as never);
    const body = await (await call()).json();
    expect(body.lines).toBeUndefined();
  });

  it('handles missing product field gracefully (productId becomes empty string)', async () => {
    vi.mocked(getDocument).mockResolvedValueOnce({
      id: 'doc-1',
      lines: {
        items: [{ id: 'l1', quantity: 1, price: '5' }],
      },
    } as never);
    const body = await (await call()).json();
    expect(body.lines[0].productId).toBe('');
    expect(body.lines[0].rowTotal).toBe('5.00');
  });
});
