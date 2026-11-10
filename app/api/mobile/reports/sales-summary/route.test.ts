import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    throw new Error('UNAUTHENTICATED');
  },
}));

import { GET } from './route';

describe('mobile reports sales-summary route', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await GET(
      new Request(
        'http://t/api/mobile/reports/sales-summary?from=2026-01-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z',
      ),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 with missing query (auth gate fires first)', async () => {
    const res = await GET(new Request('http://t/api/mobile/reports/sales-summary'));
    expect(res.status).toBe(401);
  });
});
