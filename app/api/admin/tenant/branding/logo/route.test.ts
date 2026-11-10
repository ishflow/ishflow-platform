import { describe, expect, it, vi } from 'vitest';

// Finding E8: the branding-logo signer allowed `svg` + a client-supplied
// content-type, so a tenant owner could upload an SVG with embedded script to
// the public bucket (stored-XSS shape). Restrict to raster image types.
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => ({
    tenant: { id: '00000000-0000-0000-0000-000000000001', plan: 'business' },
    permissions: new Set<string>(['owner:branding']),
  }),
}));
vi.mock('@/platform/billing/branding-gate', () => ({ requireBranding: () => {} }));
vi.mock('@/lib/r2', () => ({ signPutUrl: async () => 'https://signed.example/put' }));

import { POST } from './route';

function post(body: Record<string, unknown>): Request {
  return new Request('https://x/api/admin/tenant/branding/logo', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/tenant/branding/logo content safety', () => {
  it('rejects an SVG file extension', async () => {
    const res = await POST(
      post({ filename: 'logo.svg', contentType: 'image/svg+xml', size: 1000 }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a non-raster content-type even with a png extension', async () => {
    const res = await POST(
      post({ filename: 'logo.png', contentType: 'image/svg+xml', size: 1000 }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts a png upload with a matching content-type', async () => {
    const res = await POST(post({ filename: 'logo.png', contentType: 'image/png', size: 1000 }));
    expect(res.status).toBe(200);
  });
});
