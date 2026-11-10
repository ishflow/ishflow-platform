import { describe, expect, it, vi } from 'vitest';

// Caller is an authenticated tenant member but LACKS inventory.warehouse_stock:read
// (e.g. the cashier role). The endpoint exposes per-warehouse stock and must
// gate exactly like its twin /api/warehouse-stock. Finding A3.
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => ({
    tenant: { id: '00000000-0000-0000-0000-000000000001' },
    permissions: new Set<string>(['sales.payment_received:read']),
  }),
}));

import { GET } from './route';

describe('GET /api/stock-balance authz', () => {
  it('403s when the caller lacks inventory.warehouse_stock:read', async () => {
    const res = await GET(
      new Request('https://x/api/stock-balance?product=00000000-0000-0000-0000-0000000000aa'),
    );
    expect(res.status).toBe(403);
  });
});
