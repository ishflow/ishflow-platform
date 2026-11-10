import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('clerk webhook POST', () => {
  it('returns 400 when svix headers are missing', async () => {
    const req = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('missing_svix_headers');
  });

  it('returns 400 on bad signature', async () => {
    const req = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      headers: {
        'svix-id': 'id',
        'svix-timestamp': '1',
        'svix-signature': 'v1,invalid',
      },
      body: JSON.stringify({ type: 'user.created', data: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('signature_verification_failed');
  });
});
