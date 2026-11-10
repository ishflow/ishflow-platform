import { verifyHandoffToken } from '@/platform/billing/mobile-handoff';
import type { HandoffPayload } from '@/platform/billing/mobile-handoff';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ handoff?: string }>;
}

function targetUrl(locale: string, payload: HandoffPayload): string {
  if (payload.target === 'checkout') {
    const qs = new URLSearchParams();
    qs.set('action', 'checkout');
    if (payload.plan) qs.set('plan', payload.plan);
    if (payload.interval) qs.set('interval', payload.interval);
    return `/${locale}/admin/billing?${qs.toString()}`;
  }
  if (payload.target === 'portal') {
    return `/${locale}/admin/billing?action=portal`;
  }
  return `/${locale}/admin/billing`;
}

export default async function BillingHandoffPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { handoff } = await searchParams;

  const signInTo = (target: string) =>
    `/${locale}/sign-in?return_url=${encodeURIComponent(target)}`;

  if (!handoff) {
    redirect(signInTo('/admin/billing'));
  }

  let payload: HandoffPayload;
  try {
    payload = await verifyHandoffToken(handoff);
  } catch {
    redirect(signInTo('/admin/billing'));
  }

  // If the user is not signed in on the web (no Clerk session), drop them
  // at the locale-prefixed sign-in page with a return_url to /admin/billing.
  const { userId } = await auth();
  if (!userId) {
    redirect(signInTo('/admin/billing'));
  }

  redirect(targetUrl(locale, payload));
}
