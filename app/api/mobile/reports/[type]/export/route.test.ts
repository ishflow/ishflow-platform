import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));

vi.mock('@/lib/reports/exporters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reports/exporters')>();
  return { ...actual, renderReport: vi.fn() };
});

vi.mock('@/lib/reports/summary', () => ({
  computeSummary: vi.fn(),
}));

vi.mock('@/lib/reports/pdf-renderer', () => ({
  renderReportAsPDF: vi.fn(),
}));

import { requireTenantContext } from '@/platform/auth/current-context';
import { renderReport } from '@/lib/reports/exporters';
import { computeSummary } from '@/lib/reports/summary';
import { renderReportAsPDF } from '@/lib/reports/pdf-renderer';
import { GET } from './route';

const ownerCtx = {
  tenant: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Acme', currency: 'USD' },
  user: { id: 'u1' },
  membership: { id: 'm1' },
  permissions: new Set(['*:*', 'reports:read']),
  scopesByEntity: new Map(),
} as unknown as Awaited<ReturnType<typeof requireTenantContext>>;

const salesCtx = {
  tenant: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Acme', currency: 'USD' },
  user: { id: 'u1' },
  membership: { id: 'm1' },
  permissions: new Set(['sales.invoice:write', '*:read']),
  scopesByEntity: new Map(),
} as unknown as Awaited<ReturnType<typeof requireTenantContext>>;

function makeRequest(type: string, query: string) {
  const req = new Request(`http://localhost/api/mobile/reports/${type}/export?${query}`);
  return req as unknown as import('next/server').NextRequest;
}

describe('GET /api/mobile/reports/[type]/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(computeSummary).mockResolvedValue({
      type: 'ar-aging',
      period: { from: '2026-05-01', to: '2026-05-11', label: 'this-month' },
      currency: 'USD',
      hero: { value: 100, deltaPct: null, deltaSign: 'flat' },
      breakdown: [{ id: 'a', label: 'Acme', value: 100, meta: { bucket: '0-30' } }],
    });
    vi.mocked(renderReportAsPDF).mockResolvedValue(
      new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]), // "%PDF-1."
    );
    vi.mocked(renderReport).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'text/csv; charset=utf-8',
      filename: 'gross-profit-test.csv',
    });
  });

  it('returns 401 without auth', async () => {
    vi.mocked(requireTenantContext).mockRejectedValueOnce(new Error('unauthorized'));
    const req = makeRequest('gross-profit', 'format=csv');
    const res = await GET(req, { params: Promise.resolve({ type: 'gross-profit' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 on unknown type', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(ownerCtx);
    const req = makeRequest('unknown-type', 'format=csv');
    const res = await GET(req, { params: Promise.resolve({ type: 'unknown-type' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 + text/csv for gross-profit csv', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(ownerCtx);
    vi.mocked(renderReport).mockResolvedValueOnce({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'text/csv; charset=utf-8',
      filename: 'gross-profit-test.csv',
    });
    const req = makeRequest('gross-profit', 'format=csv');
    const res = await GET(req, { params: Promise.resolve({ type: 'gross-profit' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
  });

  it('returns 200 + xlsx content-type for gross-profit xlsx', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(ownerCtx);
    vi.mocked(renderReport).mockResolvedValueOnce({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'gross-profit-test.xlsx',
    });
    const req = makeRequest('gross-profit', 'format=xlsx');
    const res = await GET(req, { params: Promise.resolve({ type: 'gross-profit' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('returns a PDF when format=pdf for owner', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(ownerCtx);
    const req = makeRequest('ar-aging', 'format=pdf');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('returns 403 for non-owner role on pdf export', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(salesCtx);
    const req = makeRequest('ar-aging', 'format=pdf');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(403);
  });

  it('returns 403 for non-owner on csv export too', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(salesCtx);
    const req = makeRequest('ar-aging', 'format=csv');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid format', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce(ownerCtx);
    const req = makeRequest('ar-aging', 'format=bogus');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(400);
  });
});
