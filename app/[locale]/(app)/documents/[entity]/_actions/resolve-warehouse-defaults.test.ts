import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveWarehouseDefaults } from './resolve-warehouse-defaults';

const findMany = vi.fn();

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(async () => ({
    tenant: { id: 'tenant-x' },
    user: { id: 'user-x' },
    membership: { id: 'member-x' },
    permissions: new Set(),
    scopesByEntity: new Map(),
  })),
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) => {
    return fn({
      catalog_inventory_warehouse: { findMany },
    });
  }),
}));

describe('resolveWarehouseDefaults', () => {
  beforeEach(() => {
    findMany.mockClear();
  });

  it('returns the single warehouse id when exactly one exists', async () => {
    findMany.mockResolvedValueOnce([{ id: 'wh-only' }]);
    const result = await resolveWarehouseDefaults();
    expect(result).toEqual({ warehouseId: 'wh-only' });
  });

  it('returns null when zero warehouses exist', async () => {
    findMany.mockResolvedValueOnce([]);
    const result = await resolveWarehouseDefaults();
    expect(result).toEqual({ warehouseId: null });
  });

  it('returns null when two or more warehouses exist', async () => {
    findMany.mockResolvedValueOnce([{ id: 'wh-1' }, { id: 'wh-2' }]);
    const result = await resolveWarehouseDefaults();
    expect(result).toEqual({ warehouseId: null });
  });

  it('queries with take: 2 (perf — only need to know if count > 1)', async () => {
    findMany.mockResolvedValueOnce([{ id: 'wh-1' }]);
    await resolveWarehouseDefaults();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
  });
});
