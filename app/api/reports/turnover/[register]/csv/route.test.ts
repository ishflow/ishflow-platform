/**
 * Tests for the turnover CSV export route.
 *
 * Section A: Pure unit tests for the rowsToCsv helper (no DB, no auth).
 * Section B: Integration test against a real DB for the GET handler.
 *
 * Note on BOM assertions: WHATWG Response.text() strips the UTF-8 BOM
 * during decoding per the Encoding spec. BOM presence is verified via
 * arrayBuffer() — checking that the first 3 bytes are 0xEF 0xBB 0xBF.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

// ─── vi.mock must be at top level (vitest hoists them) ───────────────────────
// The factory closures capture `testTenantId` which is set after the mock
// declarations in source order, but factories are called lazily on first
// import so the value is always populated before the factory executes.

const testTenantId = randomUUID();

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: 'csv-test-user', orgId: `org_${testTenantId}` }),
  clerkClient: async () => ({}),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => ({
    user: { id: 'csv-test-user', clerkId: 'csv-test-user' },
    tenant: { id: testTenantId, clerkOrgId: `org_${testTenantId}` },
    membership: { id: 'm1', tenantId: testTenantId, userId: 'csv-test-user' },
  }),
}));

// ─── All other imports after vi.mock ──────────────────────────────────────────
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import { afterAll, beforeAll } from 'vitest';
import { GET, rowsToCsv } from './route';

// ─── Section A: rowsToCsv unit tests (pure, no DB, no auth) ─────────────────

describe('rowsToCsv', () => {
  it('produces a CSV string with header and data rows', () => {
    const csv = rowsToCsv(
      ['Customer'],
      [{ dimValues: ['Acme Corp'], opening: 0, income: 100, expense: 50.5, closing: 49.5 }],
    );
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Customer,opening,income,expense,closing');
    expect(lines[1]).toBe('Acme Corp,0.00,100.00,50.50,49.50');
  });

  it('quotes fields that contain commas', () => {
    const csv = rowsToCsv(
      ['Name'],
      [{ dimValues: ['Smith, John'], opening: 0, income: 1, expense: 0, closing: 1 }],
    );
    expect(csv).toContain('"Smith, John"');
  });

  it('doubles internal quotes (RFC 4180)', () => {
    const csv = rowsToCsv(
      ['Note'],
      [{ dimValues: ['He said "hello"'], opening: 0, income: 0, expense: 0, closing: 0 }],
    );
    expect(csv).toContain('"He said ""hello"""');
  });

  it('handles multiple dimension columns', () => {
    const csv = rowsToCsv(
      ['Customer', 'Product'],
      [
        {
          dimValues: ['Acme', 'Widget'],
          opening: 10,
          income: 20,
          expense: 5,
          closing: 25,
        },
      ],
    );
    const header = csv.split('\r\n')[0];
    expect(header).toBe('Customer,Product,opening,income,expense,closing');
  });

  it('produces only the header row when rows array is empty', () => {
    const csv = rowsToCsv(['Customer'], []);
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
  });
});

// ─── Section B: GET handler integration tests (real DB, mocked auth) ─────────

const productId = randomUUID();

beforeAll(async () => {
  // Upsert the test tenant so RLS policies accept the connection.
  await withBypass(async (tx) => {
    const db = tx as unknown as {
      tenant: {
        upsert: (a: unknown) => Promise<unknown>;
      };
    };
    await db.tenant.upsert({
      where: { id: testTenantId },
      update: {},
      create: {
        id: testTenantId,
        clerkOrgId: `org_${testTenantId}`,
        name: `csv-test-${testTenantId.slice(0, 6)}`,
        slug: `csv-${testTenantId.slice(0, 8)}`,
      },
    });
  });

  const warehouseId = randomUUID();
  await withTenant(testTenantId, async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseId,
      testTenantId,
      'MAIN',
      'CSV test WH',
    );
  });

  // Seed one stock_balance movement for the test tenant.
  await withTenant(testTenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_inventory_stock_balance: { create: (args: unknown) => Promise<unknown> };
    };
    await bag.movement_inventory_stock_balance.create({
      data: {
        tenantId: testTenantId,
        docRef: randomUUID(),
        docType: 'csv-test',
        kind: 'income',
        active: true,
        timestamp: new Date('2026-01-15T00:00:00Z'),
        warehouse: warehouseId,
        product: productId,
        quantity: 42,
        totalCost: 0,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    const db = tx as unknown as {
      $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>;
      tenant: { delete: (args: unknown) => Promise<unknown> };
    };
    await db.$executeRawUnsafe(
      'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
      testTenantId,
    );
    await db.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
      testTenantId,
    );
    await db.tenant.delete({ where: { id: testTenantId } });
  });
});

describe('GET /api/reports/turnover/[register]/csv', () => {
  it('returns 404 for unknown register', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/unknown.register/csv?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'unknown.register' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with text/csv content-type', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/csv?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
  });

  it('body starts with UTF-8 BOM bytes (0xEF 0xBB 0xBF)', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/csv?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    // WHATWG Response.text() strips the BOM during UTF-8 decoding per spec.
    // Check the raw bytes instead.
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it('contains opening,income,expense,closing header columns', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/csv?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    // Decode without BOM stripping by reading text after BOM check.
    const text = await res.text();
    const headerLine = text.split('\r\n')[0] ?? '';
    expect(headerLine).toContain('opening');
    expect(headerLine).toContain('income');
    expect(headerLine).toContain('expense');
    expect(headerLine).toContain('closing');
  });

  it('contains at least one data row (header + at least one body line)', async () => {
    const registerCfg = getRegistry().register['inventory.stock_balance'];
    if (!registerCfg) throw new Error('stock_balance not registered');

    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/csv?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    const text = await res.text();
    const lines = text.split('\r\n').filter((l) => l.length > 0);
    // At least header + 1 data row
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('sets Content-Disposition with filename containing the register slug', async () => {
    const req = new Request(
      'http://localhost:3100/api/reports/turnover/inventory.stock_balance/csv?from=2026-01-01&to=2026-12-31',
    );
    const res = await GET(req, {
      params: Promise.resolve({ register: 'inventory.stock_balance' }),
    });
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('inventory.stock_balance');
  });
});
