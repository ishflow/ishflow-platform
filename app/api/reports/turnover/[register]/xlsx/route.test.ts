/**
 * Tests for the turnover xlsx export route.
 *
 * Section A: Happy-path — mocked auth, verifies 200 + spreadsheetml MIME.
 * Section B: Unauth — requireTenantContext throws, handler returns 401.
 *
 * The tests do NOT connect to the database; all DB calls are short-circuited
 * by mocking the data layer so the suite runs in CI without Postgres.
 */

import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── vi.mock must be at top level (vitest hoists them) ───────────────────────

const testTenantId = randomUUID();

// Default: authenticated
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(async () => ({
    user: { id: 'xlsx-test-user', clerkId: 'xlsx-test-user' },
    tenant: { id: testTenantId, clerkOrgId: `org_${testTenantId}` },
    membership: { id: 'm1', tenantId: testTenantId, userId: 'xlsx-test-user' },
  })),
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) => {
    // Return empty rows for turnover queries; empty array for ref lookups.
    return fn({});
  }),
}));

vi.mock('@/platform/engine', () => ({
  turnover: vi.fn(async () => [
    {
      product: 'prod-uuid-1',
      opening: 0,
      income: 100,
      expense: 50.5,
      closing: 49.5,
    },
  ]),
}));

// ─── Imports after vi.mock ────────────────────────────────────────────────────
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import { requireTenantContext } from '@/platform/auth/current-context';
import { GET } from './route';

// ─── Section A: Happy path ────────────────────────────────────────────────────

describe('GET /api/reports/turnover/[register]/xlsx — happy path', () => {
  it('returns 200 with spreadsheetml content-type', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/xlsx?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('returns a non-empty binary body (xlsx magic bytes PK)', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/xlsx?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // xlsx is a ZIP file; starts with PK (0x50 0x4B)
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('sets Content-Disposition with attachment and register slug in filename', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/xlsx?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('inventory.stock_balance');
    expect(disposition).toContain('.xlsx');
  });

  it('returns 404 for an unknown register slug', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/unknown.register/xlsx?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'unknown.register' }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── Section B: Unauthenticated ───────────────────────────────────────────────

describe('GET /api/reports/turnover/[register]/xlsx — unauthenticated', () => {
  beforeEach(() => {
    vi.mocked(requireTenantContext).mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { status: 401 }),
    );
  });

  afterEach(() => {
    vi.mocked(requireTenantContext).mockRestore();
  });

  it('propagates the error thrown by requireTenantContext (results in 401)', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/xlsx?from=2026-01-01&to=2026-12-31',
    );
    await expect(
      GET(req, {
        params: Promise.resolve({ register: 'inventory.stock_balance' }),
      }),
    ).rejects.toThrow('Unauthorized');
  });
});
