/**
 * Wrapper that resolves the tenant owner's email + locale and dispatches the
 * trial-ending Resend email. Used by `handlers/trial-will-end.ts` (Stripe
 * `customer.subscription.trial_will_end`) and by the
 * `/api/cron/trial-ending-soon` daily reminder cron.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { sendTrialEndingEmail as sendTrialEndingRaw } from '@/platform/email/send-trial-ending';

function normalizeLocale(locale: string | null | undefined): 'en' | 'ru' | 'tr' {
  if (locale === 'ru' || locale === 'tr') return locale;
  return 'en';
}

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://ishflow.com';

export async function sendTrialEndingEmail(tenantId: string, daysLeft: number): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[billing] RESEND_API_KEY not set — trial-ending email skipped', { tenantId });
    return;
  }

  const owner = await withBypass((tx) =>
    tx.membership.findFirst({
      where: {
        tenantId,
        roles: { some: { name: 'owner', isSystem: true } },
      },
      select: {
        user: { select: { email: true } },
        tenant: { select: { name: true, defaultLocale: true } },
      },
    }),
  );

  if (!owner?.user?.email || !owner.tenant) return;

  const locale = normalizeLocale(owner.tenant.defaultLocale);
  const upgradeUrl = `${WEB_BASE_URL}/${locale}/admin/billing`;

  await sendTrialEndingRaw({
    to: owner.user.email,
    workspaceName: owner.tenant.name,
    daysLeft,
    upgradeUrl,
    locale,
  });
}
