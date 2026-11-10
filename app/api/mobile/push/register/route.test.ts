import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    throw new Error('UNAUTHENTICATED');
  },
}));

import { DELETE, POST } from './route';

describe('mobile push register route', () => {
  it('POST 401 without auth', async () => {
    const res = await POST(
      new Request('http://t/api/mobile/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'x', platform: 'ios' }),
      }),
    );
    expect(res.status).toBe(401);
  });
  it('DELETE 401 without auth', async () => {
    const res = await DELETE(
      new Request('http://t/api/mobile/push/register', {
        method: 'DELETE',
        body: JSON.stringify({ token: 'x' }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
