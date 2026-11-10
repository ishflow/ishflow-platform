import { describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example'),
}));

describe('buildObjectKey', () => {
  it('builds a tenant-scoped object key', async () => {
    const { buildObjectKey } = await import('./r2');
    expect(buildObjectKey('t-1', 'e-1', 'a-1', 'photo.png')).toBe('tenants/t-1/e-1/a-1/photo.png');
  });

  it('rejects filenames with path separators', async () => {
    const { buildObjectKey } = await import('./r2');
    expect(() => buildObjectKey('t-1', 'e-1', 'a-1', '../etc/passwd')).toThrow();
  });

  it('rejects filenames with spaces', async () => {
    const { buildObjectKey } = await import('./r2');
    expect(() => buildObjectKey('t-1', 'e-1', 'a-1', 'my photo.png')).toThrow();
  });
});

describe('signPutUrl', () => {
  it('rejects content-length above 20MB', async () => {
    const { signPutUrl } = await import('./r2');
    await expect(signPutUrl('k', 'image/png', 25 * 1024 * 1024)).rejects.toThrow(/too large/);
  });

  it('returns a signed url for allowed payloads', async () => {
    process.env.R2_ACCOUNT_ID = 'test';
    process.env.R2_ACCESS_KEY_ID = 'AKIA';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET = 'bucket';
    const { signPutUrl } = await import('./r2');
    const url = await signPutUrl('k', 'image/png', 100);
    expect(url).toBe('https://signed.example');
  });
});
