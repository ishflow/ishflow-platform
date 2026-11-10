import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/admin/tenant/recover-ownership', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/recover-ownership', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
