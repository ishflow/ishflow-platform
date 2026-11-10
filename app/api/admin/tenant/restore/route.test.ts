import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/admin/tenant/restore', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await POST();
    expect(res.status).toBe(401);
  });
});
