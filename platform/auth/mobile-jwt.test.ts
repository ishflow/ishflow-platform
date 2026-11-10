import { beforeAll, describe, expect, it } from 'vitest';
import { signMobileJWT, verifyMobileJWT } from './mobile-jwt';

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = 'a'.repeat(48);
});

describe('mobile-jwt', () => {
  it('round-trips userId + tenantId + scopes', async () => {
    const token = await signMobileJWT({ userId: 'u1', tenantId: 't1', scopes: ['sales.read'] });
    const claims = await verifyMobileJWT(token);
    expect(claims.userId).toBe('u1');
    expect(claims.tenantId).toBe('t1');
    expect(claims.scopes).toEqual(['sales.read']);
  });

  it('rejects tampered payload', async () => {
    const token = await signMobileJWT({ userId: 'u1', tenantId: 't1', scopes: [] });
    const tampered = `${token}x`;
    await expect(verifyMobileJWT(tampered)).rejects.toThrow();
  });

  it('honours nullable tenantId', async () => {
    const token = await signMobileJWT({ userId: 'u1', tenantId: null, scopes: [] });
    const claims = await verifyMobileJWT(token);
    expect(claims.tenantId).toBeNull();
  });
});
