import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { isPublicRoute } from './public-routes';

function req(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://app.ishflow.com${pathname}`));
}

const NON_DEFAULT_LOCALES = ['en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh'] as const;

describe('isPublicRoute — mobile sign-out bridge', () => {
  // Regression: the bare path (default locale ru) always worked.
  it('treats the bare /sign-out/mobile as public', () => {
    expect(isPublicRoute(req('/sign-out/mobile'))).toBe(true);
    expect(isPublicRoute(req('/ru/sign-out/mobile'))).toBe(true);
  });

  // The bug: next-intl 307-redirects a non-ru device's bare /sign-out/mobile to
  // /{locale}/sign-out/mobile. Without that prefixed form being public,
  // auth.protect() derailed the Custom Tab to the global web sign-in and the
  // deep-link handoff died — for every non-default locale.
  it.each(NON_DEFAULT_LOCALES)(
    'treats /%s/sign-out/mobile (next-intl redirect target) as public',
    (locale) => {
      expect(isPublicRoute(req(`/${locale}/sign-out/mobile`))).toBe(true);
    },
  );

  // Symmetry: the sign-in / sign-up bridges were already public in both forms;
  // assert it stays that way so a future edit can't regress the full family.
  it.each(NON_DEFAULT_LOCALES)('keeps /%s/sign-in/mobile + sign-up/mobile public', (locale) => {
    expect(isPublicRoute(req(`/${locale}/sign-in/mobile`))).toBe(true);
    expect(isPublicRoute(req(`/${locale}/sign-in/mobile/complete`))).toBe(true);
    expect(isPublicRoute(req(`/${locale}/sign-up/mobile`))).toBe(true);
  });

  // Discrimination guard: prove the matcher isn't a blanket "everything public".
  // /super-admin is intentionally excluded so it stays behind auth.protect().
  it('does NOT treat /super-admin as public', () => {
    expect(isPublicRoute(req('/super-admin'))).toBe(false);
    expect(isPublicRoute(req('/en/super-admin'))).toBe(false);
    expect(isPublicRoute(req('/en/super-admin/tenants'))).toBe(false);
  });
});
