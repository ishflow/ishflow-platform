import { withBypass } from '@/platform/db/tenant-context';
import {
  type DowngradeBlockedKind,
  sendDowngradeBlockedEmail as sendDowngradeBlockedRaw,
} from '@/platform/email/send-downgrade-blocked';
/**
 * Wrapper that resolves the tenant owner's email + locale and dispatches the
 * downgrade-blocked Resend email. Used by `handlers/subscription-updated.ts`
 * when a Stripe-initiated downgrade is rejected because current usage exceeds
 * the proposed plan's limits.
 */
import type { TenantPlan } from '@prisma/client';

export interface DowngradeBlockedViolation {
  kind: DowngradeBlockedKind;
  current: number;
  newLimit: number;
}

function normalizeLocale(locale: string | null | undefined): 'en' | 'ru' | 'tr' {
  if (locale === 'ru' || locale === 'tr') return locale;
  return 'en';
}

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://ishflow.com';

export async function sendDowngradeBlockedEmail(
  tenantId: string,
  newPlan: TenantPlan,
  violation: DowngradeBlockedViolation,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[billing] RESEND_API_KEY not set — downgrade-blocked email skipped', {
      tenantId,
    });
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
  const billingUrl = `${WEB_BASE_URL}/${locale}/admin/billing`;

  await sendDowngradeBlockedRaw({
    to: owner.user.email,
    workspaceName: owner.tenant.name,
    newPlan,
    kind: violation.kind,
    current: violation.current,
    allowed: violation.newLimit,
    billingUrl,
    locale,
  });
}
