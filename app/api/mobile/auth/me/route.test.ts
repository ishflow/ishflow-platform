import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /api/mobile/auth/me', () => {
  it('308-redirects to /api/mobile/me preserving query', async () => {
    const req = new NextRequest('http://x/api/mobile/auth/me?foo=bar');
    const res = await GET(req);
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://x/api/mobile/me?foo=bar');
  });
});
