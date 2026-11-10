import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    throw new Error('UNAUTHENTICATED');
  },
}));

import { GET } from './route';

describe('mobile reports ar-aging route', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await GET(new Request('http://t/api/mobile/reports/ar-aging'));
    expect(res.status).toBe(401);
  });
});
