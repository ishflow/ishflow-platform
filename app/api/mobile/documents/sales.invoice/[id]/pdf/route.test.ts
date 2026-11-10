import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const tenantId = '00000000-0000-0000-0000-000000000001';

const mockedAuth = vi.hoisted(() => ({
  shouldFail: false,
}));

const mockedRender = vi.hoisted(() => ({
  renderSalesInvoicePdf: vi.fn(),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    if (mockedAuth.shouldFail) throw new Error('UNAUTHENTICATED');
    return {
      tenant: { id: tenantId, name: 'Test', slug: 'test' },
      user: { id: 'u1', clerkId: 'c1' },
      membership: { id: 'm1', tenantId, userId: 'u1', roles: ['admin'] },
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map(),
    };
  },
}));

vi.mock('@/lib/pdf/render-document', () => ({
  renderSalesInvoicePdf: mockedRender.renderSalesInvoicePdf,
}));

import { GET } from './route';

describe('GET /api/mobile/documents/sales.invoice/:id/pdf', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedRender.renderSalesInvoicePdf.mockReset();
  });

  it('returns 401 when authentication fails', async () => {
    mockedAuth.shouldFail = true;
    const req = new NextRequest('http://test/api/mobile/documents/sales.invoice/doc-1/pdf');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 200 and application/pdf on success', async () => {
    mockedRender.renderSalesInvoicePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const req = new NextRequest('http://test/api/mobile/documents/sales.invoice/doc-1/pdf');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const body = await res.arrayBuffer();
    expect(new Uint8Array(body)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns 404 when document is not found', async () => {
    mockedRender.renderSalesInvoicePdf.mockRejectedValue(new Error('NOT_FOUND'));
    const req = new NextRequest('http://test/api/mobile/documents/sales.invoice/doc-1/pdf');
    const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
    expect(res.status).toBe(404);
  });
});
