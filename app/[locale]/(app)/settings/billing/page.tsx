import { type PlanKey, V2BillingOverview } from '@/components/v2/settings/billing/overview';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { isSubscriptionPaymentsEnabledAsync } from '@/platform/billing/feature-state';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type TenantStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'cancelled' | 'deleted';

export default async function V2BillingPage() {
  const t = await getTranslations('v2_settings.billing');

  let planKey: PlanKey = 'free';
  let status: TenantStatus = 'active';
  let trialEndsAt: string | null = null;
  let seats = 0;
  let companyName = '';
  let contactEmail = '';
  try {
    const ctx = await requireTenantContext();
    planKey = (ctx.tenant.plan as PlanKey) ?? 'free';
    status = (ctx.tenant.status as TenantStatus) ?? 'active';
    trialEndsAt = ctx.tenant.trialEndsAt ? new Date(ctx.tenant.trialEndsAt).toISOString() : null;
    companyName = ctx.tenant.name ?? '';
    contactEmail = ctx.user.email ?? '';
    seats = await withTenant(ctx.tenant.id, (tx) => tx.membership.count());
  } catch {
    /* unauthenticated — render the chrome with the free baseline */
  }
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const paymentsEnabled = await isSubscriptionPaymentsEnabledAsync();

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2BillingOverview
          planKey={planKey}
          status={status}
          seats={seats}
          trialEndsAt={trialEndsAt}
          stripeConfigured={stripeConfigured}
          paymentsEnabled={paymentsEnabled}
          companyName={companyName}
          contactEmail={contactEmail}
        />
      </div>
    </>
  );
}
