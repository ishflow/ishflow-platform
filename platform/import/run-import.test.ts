import type { AppContext } from '@/platform/auth/current-context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/configs/sales/catalogs/customer';
import '@/configs/inventory/catalogs/product';
import '@/configs/purchases/catalogs/supplier';
import { runImport } from './run-import';

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<typeof import('@/platform/engine')>('@/platform/engine');
  return {
    ...actual,
    createRecord: vi.fn(),
    listRecords: vi.fn(),
  };
});

import { createRecord, listRecords } from '@/platform/engine';

const ctx = {
  tenant: { id: 'tenant-1' },
  user: { id: 'user-1' },
  permissions: new Set<string>(['admin.organization:edit', 'sales.customer:create']),
  membership: null,
  viewAsRole: null,
} as unknown as AppContext;

beforeEach(() => {
  vi.mocked(createRecord).mockReset();
  vi.mocked(listRecords).mockReset();
  vi.mocked(listRecords).mockResolvedValue([]);
});

describe('runImport — customer', () => {
  it('inserts all valid rows', async () => {
    vi.mocked(createRecord).mockResolvedValue({ id: 'x' });
    const out = await runImport(ctx, 'customer', [
      { name: 'Acme' },
      { name: 'Beta', email: 'b@example.com' },
    ]);
    expect(out.inserted).toBe(2);
    expect(out.skipped).toBe(0);
    expect(out.errors).toEqual([]);
    expect(createRecord).toHaveBeenCalledTimes(2);
  });

  it('captures validation errors per row with row index', async () => {
    const out = await runImport(ctx, 'customer', [
      { name: 'Acme' },
      { name: '' },
      { name: 'Beta', email: 'not-email' },
    ]);
    expect(out.inserted).toBe(0);
    expect(out.errors).toHaveLength(2);
    expect(out.errors[0]?.row).toBe(2);
    expect(out.errors[1]?.row).toBe(3);
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('skips rows whose externalId already exists (idempotent re-import)', async () => {
    vi.mocked(listRecords).mockResolvedValue([{ externalId: 'CUST-001' }]);
    vi.mocked(createRecord).mockResolvedValue({ id: 'x' });
    const out = await runImport(ctx, 'customer', [
      { name: 'Acme', externalId: 'CUST-001' },
      { name: 'Beta', externalId: 'CUST-002' },
    ]);
    expect(out.skipped).toBe(1);
    expect(out.inserted).toBe(1);
  });

  it('records DB errors per row and continues with subsequent rows', async () => {
    vi.mocked(createRecord)
      .mockRejectedValueOnce(new Error('Unique constraint on name'))
      .mockResolvedValueOnce({ id: 'x' });
    const out = await runImport(ctx, 'customer', [{ name: 'Duplicate' }, { name: 'Fresh' }]);
    expect(out.inserted).toBe(1);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]?.row).toBe(1);
    expect(out.errors[0]?.message).toContain('Unique');
  });

  it('rejects empty row arrays', async () => {
    await expect(runImport(ctx, 'customer', [])).rejects.toThrow(/no rows/i);
  });

  it('rejects more than 1000 rows', async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({ name: `R${i}` }));
    await expect(runImport(ctx, 'customer', rows)).rejects.toThrow(/too many/i);
  });
});

describe('runImport — product', () => {
  it('inserts a product without code (engine auto-generates it)', async () => {
    vi.mocked(createRecord).mockResolvedValue({ id: 'p1' });
    const out = await runImport(ctx, 'product', [{ name: 'Widget' }]);
    expect(out.inserted).toBe(1);
    expect(createRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'inventory.product' }),
      expect.objectContaining({ name: 'Widget' }),
    );
  });
});

describe('runImport — supplier', () => {
  it('inserts a supplier into purchases.supplier', async () => {
    vi.mocked(createRecord).mockResolvedValue({ id: 's1' });
    const out = await runImport(ctx, 'supplier', [{ name: 'Acme Supplies' }]);
    expect(out.inserted).toBe(1);
    expect(createRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'purchases.supplier' }),
      expect.objectContaining({ name: 'Acme Supplies' }),
    );
  });

  it('skips suppliers whose externalId already exists', async () => {
    vi.mocked(listRecords).mockResolvedValue([{ externalId: 'SUP-1' }]);
    vi.mocked(createRecord).mockResolvedValue({ id: 's2' });
    const out = await runImport(ctx, 'supplier', [
      { name: 'Old', externalId: 'SUP-1' },
      { name: 'New', externalId: 'SUP-2' },
    ]);
    expect(out.skipped).toBe(1);
    expect(out.inserted).toBe(1);
  });
});
