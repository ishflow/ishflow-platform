import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './next.config';

/**
 * Finding E6: HSTS must be emitted from version-controlled config (not only the
 * Vercel edge default) so it survives a host/CDN change. Also a guard against
 * accidental removal of the baseline header set.
 */
describe('SECURITY_HEADERS', () => {
  const byKey = new Map(SECURITY_HEADERS.map((h) => [h.key, h.value]));

  it('includes a 2-year HSTS header with includeSubDomains', () => {
    const hsts = byKey.get('Strict-Transport-Security');
    expect(hsts).toBeDefined();
    expect(hsts).toContain('max-age=63072000');
    expect(hsts).toContain('includeSubDomains');
  });

  it('keeps the baseline hardening headers', () => {
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
    expect(byKey.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(byKey.has('Referrer-Policy')).toBe(true);
    expect(byKey.has('Permissions-Policy')).toBe(true);
  });
});
