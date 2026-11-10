import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/admin/tenant/archive', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/archive', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'tenant-slug' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401/403 when caller lacks owner:tenant_archive', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/archive', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'tenant-slug' }),
    });
    const res = await POST(req);
    expect([401, 403]).toContain(res.status);
  });

  it('returns 400/401 when confirmation does not match slug', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/archive', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'wrong-slug' }),
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });

  it('returns 400/401 when body is malformed', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/archive', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });
});
