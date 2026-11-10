import { prisma } from '@/platform/db';
import { verifyNewsletterToken } from '@/platform/marketing/newsletter-token';
import { getSiteUrl } from '@/platform/marketing/site-url';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Double opt-in confirmation endpoint.
 *
 *   GET /api/marketing/newsletter/confirm?token=...&email=...
 *
 * Redirects to /newsletter-confirmed (success) or /newsletter-error so the
 * user lands on a real page either way. Token is HMAC-signed, single-use
 * conceptually (idempotent: re-confirming a row is a no-op).
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const emailRaw = url.searchParams.get('email') ?? '';
  const email = emailRaw.trim().toLowerCase();

  const siteUrl = getSiteUrl();

  if (!token || !email) {
    return NextResponse.redirect(`${siteUrl}/?newsletter=error`);
  }

  const verified = verifyNewsletterToken(token, email);
  if (!verified) {
    return NextResponse.redirect(`${siteUrl}/?newsletter=error`);
  }

  try {
    const row = await prisma.marketingNewsletterSubscriber.findUnique({
      where: { id: verified.subscriberId },
      select: { id: true, email: true, confirmedAt: true },
    });
    if (!row || row.email.toLowerCase() !== email) {
      return NextResponse.redirect(`${siteUrl}/?newsletter=error`);
    }
    if (!row.confirmedAt) {
      await prisma.marketingNewsletterSubscriber.update({
        where: { id: row.id },
        data: { confirmedAt: new Date(), unsubscribedAt: null },
      });
    }
    return NextResponse.redirect(`${siteUrl}/?newsletter=confirmed`);
  } catch (err) {
    console.error('[marketing] newsletter confirm failed:', err);
    return NextResponse.redirect(`${siteUrl}/?newsletter=error`);
  }
}
