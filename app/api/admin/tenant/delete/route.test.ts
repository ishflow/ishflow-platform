import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/admin/tenant/delete', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/delete', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'tenant-slug' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401/403/400 for empty body', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/delete', {
      method: 'POST',
      body: '{}',
    });
    const res = await POST(req);
    expect([400, 401, 403]).toContain(res.status);
  });

  it('returns 400/401 when force=true without doubleConfirm', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/delete', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'tenant-slug', force: true }),
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });
});
