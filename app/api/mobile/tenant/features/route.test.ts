import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    throw new Error('UNAUTHENTICATED');
  },
}));

import { GET } from './route';

describe('GET /api/mobile/tenant/features', () => {
  it('returns 401 without auth', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
