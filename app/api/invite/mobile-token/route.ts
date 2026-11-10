import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Mint the mobile deep-link for the "Open in app" handoff on `/invite/done`.
 * Mirrors `/sign-in/mobile/complete`'s token mint: try the `mobile` JWT
 * template first (carries the extra claims mobile features rely on), fall back
 * to the default session token (the server only reads `sub` + `org_id`, both
 * present on the default token). Returns the `ishflow://auth/callback?token=…`
 * URL the native apps already consume. 401 when there's no Clerk session.
 */
export async function GET(): Promise<NextResponse> {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let token = await getToken({ template: 'mobile' }).catch(() => null);
  if (!token) {
    token = await getToken();
  }
  if (!token) {
    return NextResponse.json({ error: 'token_mint_failed' }, { status: 401 });
  }

  return NextResponse.json({
    deepLink: `ishflow://auth/callback?token=${token}`,
  });
}
