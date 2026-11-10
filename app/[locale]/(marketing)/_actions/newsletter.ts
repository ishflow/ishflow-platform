'use server';

import { prisma } from '@/platform/db';
import { signNewsletterToken } from '@/platform/marketing/newsletter-token';
import { sendNewsletterConfirmEmail } from '@/platform/marketing/send-emails';
import { getSiteUrl } from '@/platform/marketing/site-url';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email().max(254),
  locale: z.string().max(8).optional(),
  source: z.string().max(64).optional(),
});

export interface SubscribeResult {
  ok: boolean;
  error?: 'invalid_email' | 'already_subscribed' | 'failed';
  pendingConfirmation?: boolean;
}

export async function subscribeNewsletter(input: {
  email: string;
  locale?: string;
  source?: string;
}): Promise<SubscribeResult> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_email' };

  const email = parsed.data.email.trim().toLowerCase();
  const locale = parsed.data.locale ?? 'en';
  const source = parsed.data.source ?? 'footer';

  try {
    const existing = await prisma.marketingNewsletterSubscriber.findUnique({
      where: { email },
      select: { id: true, confirmedAt: true, unsubscribedAt: true },
    });

    let subscriberId: string;

    if (existing) {
      if (existing.confirmedAt && !existing.unsubscribedAt) {
        return { ok: true, error: 'already_subscribed' };
      }
      subscriberId = existing.id;
      // re-arm: clear unsubscribe, keep confirmedAt null so double opt-in fires
      await prisma.marketingNewsletterSubscriber.update({
        where: { id: existing.id },
        data: { unsubscribedAt: null, source },
      });
    } else {
      const created = await prisma.marketingNewsletterSubscriber.create({
        data: { email, source },
        select: { id: true },
      });
      subscriberId = created.id;
    }

    const token = signNewsletterToken(subscriberId, email);
    const confirmUrl = `${getSiteUrl()}/api/marketing/newsletter/confirm?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(email)}`;

    await sendNewsletterConfirmEmail({ to: email, confirmUrl, locale });

    return { ok: true, pendingConfirmation: true };
  } catch (err) {
    console.error('[marketing] subscribeNewsletter failed:', err);
    return { ok: false, error: 'failed' };
  }
}
