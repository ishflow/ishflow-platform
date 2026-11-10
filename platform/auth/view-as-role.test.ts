import { describe, expect, it } from 'vitest';
import { canImpersonateRole, signViewAsCookie, verifyViewAsCookie } from './view-as-role';

const SECRET = 'test-secret-key-12345';

describe('canImpersonateRole', () => {
  it('rejects owner', () => {
    expect(canImpersonateRole('owner')).toBe(false);
  });

  it('allows admin and other roles', () => {
    for (const role of ['admin', 'manager', 'bookkeeper', 'sales', 'warehouse', 'viewer']) {
      expect(canImpersonateRole(role)).toBe(true);
    }
  });
});

describe('signViewAsCookie', () => {
  it('throws when role is owner', () => {
    expect(() => signViewAsCookie('owner', SECRET)).toThrow(/cannot be impersonated/);
  });
});

describe('view-as-role cookie', () => {
  it('round-trips a role', () => {
    const token = signViewAsCookie('sales', SECRET);
    expect(verifyViewAsCookie(token, SECRET)).toBe('sales');
  });

  it('returns null for tampered token', () => {
    const token = signViewAsCookie('sales', SECRET);
    const tampered = `${token.slice(0, -5)}xxxxx`;
    expect(verifyViewAsCookie(tampered, SECRET)).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = signViewAsCookie('sales', SECRET);
    expect(verifyViewAsCookie(token, 'wrong-secret')).toBeNull();
  });

  it('returns null (never throws) for a wrong-length signature — finding E7', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'sales', ts: Date.now() })).toString(
      'base64url',
    );
    const token = `${payload}.short`;
    expect(() => verifyViewAsCookie(token, SECRET)).not.toThrow();
    expect(verifyViewAsCookie(token, SECRET)).toBeNull();
  });

  it('returns null for expired token', () => {
    // Manually craft an expired token
    const payload = Buffer.from(JSON.stringify({ role: 'sales', ts: 1 })).toString('base64url');
    // biome-ignore lint/style/useNodejsImportProtocol: test-only dynamic require
    const { createHmac } = require('node:crypto');
    const sig = createHmac('sha256', SECRET).update('sales:1').digest('base64url');
    const token = `${payload}.${sig}`;
    expect(verifyViewAsCookie(token, SECRET)).toBeNull();
  });
});
