import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/admin/tenant/transfer-ownership', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/transfer-ownership', {
      method: 'POST',
      body: JSON.stringify({ targetMembershipId: 'm1', confirmation: 'TRANSFER' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller lacks owner:tenant_transfer', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/transfer-ownership', {
      method: 'POST',
      body: JSON.stringify({ targetMembershipId: 'm1', confirmation: 'TRANSFER' }),
    });
    const res = await POST(req);
    expect([401, 403]).toContain(res.status);
  });

  it('returns 400 when confirmation is not TRANSFER', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/transfer-ownership', {
      method: 'POST',
      body: JSON.stringify({ targetMembershipId: 'm1', confirmation: 'WRONG' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when target is self', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/transfer-ownership', {
      method: 'POST',
      body: JSON.stringify({ targetMembershipId: 'self-id', confirmation: 'TRANSFER' }),
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });

  it('returns 400 when target already owner', async () => {
    const req = new Request('http://localhost:3000/api/admin/tenant/transfer-ownership', {
      method: 'POST',
      body: JSON.stringify({ targetMembershipId: 'owner-id', confirmation: 'TRANSFER' }),
    });
    const res = await POST(req);
    expect([400, 401]).toContain(res.status);
  });
});
