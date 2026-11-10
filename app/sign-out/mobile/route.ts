import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Bare-path stub for `/sign-out/mobile`. next-intl's middleware rewrites
 * most requests to `/<locale>/sign-out/mobile`, so the real handler lives
 * at `app/[locale]/sign-out/mobile/route.ts`. This stub only fires for
 * direct hits that bypass the middleware (vanishingly rare) and mirrors
 * the same behaviour so we never silently 404 the Android sign-in launch
 * URL.
 *
 * Clears Clerk session cookies in the Custom Tab and redirects to the
 * mobile sign-in page with `force_login=1`. Used by the Android client
 * whenever the user taps "Sign In" — without this round-trip, Chrome's
 * persisted Clerk cookie auto-resumes the previous session and the user
 * can never switch accounts after signing out from the app.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const returnUrl = req.nextUrl.searchParams.get('return_url');
  const target = new URL('/sign-in/mobile', req.url);
  target.searchParams.set('force_login', '1');
  if (returnUrl) {
    target.searchParams.set('return_url', returnUrl);
  }

  const res = NextResponse.redirect(target);
  res.headers.set('Clear-Site-Data', '"cookies"');

  for (const c of req.cookies.getAll()) {
    if (
      c.name.startsWith('__session') ||
      c.name.startsWith('__client') ||
      c.name.startsWith('__clerk')
    ) {
      res.cookies.set(c.name, '', { maxAge: 0, path: '/' });
    }
  }

  return res;
}
