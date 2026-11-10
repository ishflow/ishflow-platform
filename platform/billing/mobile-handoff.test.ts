import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mintHandoffToken, verifyHandoffToken } from './mobile-handoff';

const ORIGINAL = process.env.MOBILE_JWT_SECRET;

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET =
    process.env.MOBILE_JWT_SECRET ?? 'test-handoff-secret-please-rotate';
});
afterAll(() => {
  if (ORIGINAL === undefined) {
    process.env.MOBILE_JWT_SECRET = undefined;
  } else {
    process.env.MOBILE_JWT_SECRET = ORIGINAL;
  }
});

describe('mobile-handoff', () => {
  it('round-trips a checkout target', async () => {
    const token = await mintHandoffToken({
      userId: 'u1',
      tenantId: 't1',
      target: 'checkout',
      plan: 'pro',
      interval: 'month',
    });
    const payload = await verifyHandoffToken(token);
    expect(payload.userId).toBe('u1');
    expect(payload.tenantId).toBe('t1');
    expect(payload.target).toBe('checkout');
    expect(payload.plan).toBe('pro');
    expect(payload.interval).toBe('month');
    expect(payload.jti).toMatch(/^[0-9a-f-]+$/);
  });

  it('rejects a token with the wrong audience', async () => {
    const { SignJWT } = await import('jose');
    const secretKey = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET);
    const wrongAud = await new SignJWT({ tenantId: 't1', target: 'checkout' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setIssuer('canalog-mobile')
      .setAudience('canalog-mobile-app')
      .setExpirationTime('5m')
      .sign(secretKey);
    await expect(verifyHandoffToken(wrongAud)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const { SignJWT } = await import('jose');
    const secretKey = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET);
    const expired = await new SignJWT({ tenantId: 't1', target: 'checkout' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setIssuer('canalog-mobile')
      .setAudience('canalog-billing-handoff')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secretKey);
    await expect(verifyHandoffToken(expired)).rejects.toThrow();
  });
});
