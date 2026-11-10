import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SECRET = 'a'.repeat(64);

beforeAll(() => {
  process.env.SUPER_ADMIN_IMPERSONATION_SECRET = SECRET;
});

afterAll(() => {
  process.env.SUPER_ADMIN_IMPERSONATION_SECRET = undefined;
});

describe('super-impersonate cookie', () => {
  it('round-trips a payload', async () => {
    const { signCookie, verifyCookie } = await import('./super-impersonate');
    const token = await signCookie({ actorClerkId: 'user_super', tenantId: 'tenant_xyz' });
    const out = await verifyCookie(token);
    expect(out).not.toBeNull();
    expect(out?.actorClerkId).toBe('user_super');
    expect(out?.tenantId).toBe('tenant_xyz');
    expect(typeof out?.exp).toBe('number');
    expect(out?.exp).toBeGreaterThan(Date.now());
  });

  it('returns null for empty/undefined value', async () => {
    const { verifyCookie } = await import('./super-impersonate');
    expect(await verifyCookie(undefined)).toBeNull();
    expect(await verifyCookie(null)).toBeNull();
    expect(await verifyCookie('')).toBeNull();
  });

  it('returns null for tampered body', async () => {
    const { signCookie, verifyCookie } = await import('./super-impersonate');
    const token = await signCookie({ actorClerkId: 'user_super', tenantId: 'tenant_xyz' });
    const [body, sig] = token.split('.');
    const tampered = Buffer.from(
      JSON.stringify({
        actorClerkId: 'user_super',
        tenantId: 'tenant_hijacked',
        exp: Date.now() + 60000,
      }),
    )
      .toString('base64url')
      .replace(/=+$/, '');
    expect(await verifyCookie(`${tampered}.${sig}`)).toBeNull();
    // Body untouched (just to ensure original would have verified).
    expect(await verifyCookie(`${body}.${sig}`)).not.toBeNull();
  });

  it('returns null for tampered signature', async () => {
    const { signCookie, verifyCookie } = await import('./super-impersonate');
    const token = await signCookie({ actorClerkId: 'user_super', tenantId: 'tenant_xyz' });
    const body = token.split('.')[0] ?? '';
    // Any wrong signature should fail verification.
    expect(await verifyCookie(`${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
  });

  it('returns null for malformed token (missing dot)', async () => {
    const { verifyCookie } = await import('./super-impersonate');
    expect(await verifyCookie('not-a-valid-token')).toBeNull();
  });

  it('returns null for expired payload', async () => {
    // Sign with the real secret to bypass tamper detection, but with exp in the past.
    const { signCookie, verifyCookie } = await import('./super-impersonate');
    const token = await signCookie({ actorClerkId: 'user_super', tenantId: 'tenant_xyz' });
    // Re-sign a payload manually by reusing the public signCookie? signCookie always sets exp to now+TTL.
    // Hand-craft: take the original token, slice off body, replace exp manually via direct module access.
    const expired = {
      actorClerkId: 'user_super',
      tenantId: 'tenant_xyz',
      exp: Date.now() - 1000,
    };
    const body = Buffer.from(JSON.stringify(expired)).toString('base64url').replace(/=+$/, '');
    // Sign expired body using the same secret via signCookie internals.
    // signCookie wraps a new exp — so we need a small helper that mirrors its signing
    // shape. The easiest path: use crypto.subtle directly here too.
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const sigBytes = new Uint8Array(sigBuf);
    let sigBin = '';
    for (let i = 0; i < sigBytes.length; i++) sigBin += String.fromCharCode(sigBytes[i] as number);
    const sig = btoa(sigBin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await verifyCookie(`${body}.${sig}`)).toBeNull();
    // Use token to silence unused-var lint
    expect(token.length).toBeGreaterThan(0);
  });

  it('rejects signing when secret is missing', async () => {
    const prev = process.env.SUPER_ADMIN_IMPERSONATION_SECRET;
    process.env.SUPER_ADMIN_IMPERSONATION_SECRET = '';
    try {
      const { signCookie } = await import('./super-impersonate');
      await expect(signCookie({ actorClerkId: 'a', tenantId: 'b' })).rejects.toThrow(
        /SUPER_ADMIN_IMPERSONATION_SECRET/,
      );
    } finally {
      process.env.SUPER_ADMIN_IMPERSONATION_SECRET = prev;
    }
  });

  it('rejects signing when secret is too short', async () => {
    const prev = process.env.SUPER_ADMIN_IMPERSONATION_SECRET;
    process.env.SUPER_ADMIN_IMPERSONATION_SECRET = 'short';
    try {
      const { signCookie } = await import('./super-impersonate');
      await expect(signCookie({ actorClerkId: 'a', tenantId: 'b' })).rejects.toThrow(
        /SUPER_ADMIN_IMPERSONATION_SECRET/,
      );
    } finally {
      process.env.SUPER_ADMIN_IMPERSONATION_SECRET = prev;
    }
  });
});
