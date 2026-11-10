import { resolveContext } from '@/platform/auth/current-context';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Returns a URL for the billing portal so the mobile client can open it
 * in an in-app browser tab.
 *
 * When Stripe is configured (STRIPE_SECRET_KEY present) the server could
 * create a Checkout/Portal session; in the current setup we return the
 * web billing page URL directly, which is the same UX the iOS app uses.
 *
 * Wire: POST /api/mobile/billing/portal
 * Auth: Clerk bearer (mobile JWT)
 * 200: { url: string }
 * 401 when no session; 403 when no active tenant.
 */
export async function POST(): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!ctx.tenant) {
    return NextResponse.json({ error: 'no_active_tenant' }, { status: 403 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://ishflow.com';

  // The web billing page is at /<locale>/billing. Redirect the user to the
  // English route so the URL is locale-neutral from the mobile side.
  const url = `${appUrl}/en/billing`;

  return NextResponse.json({ url });
}
