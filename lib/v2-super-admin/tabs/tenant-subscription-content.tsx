import { SaPlanChanger } from '@/components/v2/super-admin/tenants/sa-plan-changer';
import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantSubscription } from '@/lib/v2-super-admin/load-tenant-subscription';
import type { Locale } from '@/platform/metadata';
import type { TenantPlan, TenantStatus } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

const PLAN_PILL: Record<TenantPlan, string> = {
  free: 'pill pill-neutral',
  starter: 'pill pill-info',
  pro: 'pill pill-success',
  business: 'pill pill-warning',
  enterprise: 'pill pill-info',
};

const STATUS_PILL: Record<TenantStatus, string> = {
  active: 'pill pill-success',
  trialing: 'pill pill-warning',
  past_due: 'pill pill-warning',
  suspended: 'pill pill-neutral',
  cancelled: 'pill pill-neutral',
  deleted: 'pill pill-neutral',
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function renderTenantSubscriptionTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, sub] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.subscription'),
    loadSaTenantSubscription(id),
  ]);
  if (!sub) notFound();

  const planNames: Record<TenantPlan, string> = {
    free: t('plan.options.free'),
    starter: t('plan.options.starter'),
    pro: t('plan.options.pro'),
    business: t('plan.options.business'),
    enterprise: t('plan.options.enterprise'),
  };
  const statusNames: Record<TenantStatus, string> = {
    active: t('plan.statuses.active'),
    trialing: t('plan.statuses.trialing'),
    past_due: t('plan.statuses.past_due'),
    suspended: t('plan.statuses.suspended'),
    cancelled: t('plan.statuses.cancelled'),
    deleted: t('plan.statuses.deleted'),
  };

  return (
    <SaTenantSection
      title={t('plan.title')}
      action={
        <SaPlanChanger
          tenantId={id}
          currentPlan={sub.plan}
          currentStatus={sub.status}
          i18n={{
            triggerLabel: t('plan.change'),
            title: t('plan.dialog.title'),
            description: t('plan.dialog.description'),
            planLabel: t('plan.dialog.planLabel'),
            statusLabel: t('plan.dialog.statusLabel'),
            reasonLabel: t('plan.dialog.reasonLabel'),
            reasonPlaceholder: t('plan.dialog.reasonPlaceholder'),
            cancel: t('plan.dialog.cancel'),
            confirm: t('plan.dialog.confirm'),
            saving: t('plan.dialog.saving'),
            planNames,
            statusNames,
          }}
        />
      }
    >
      <SaTenantInfoRow
        k={t('plan.name')}
        v={<span className={PLAN_PILL[sub.plan]}>{planNames[sub.plan]}</span>}
      />
      <SaTenantInfoRow
        k={t('plan.status')}
        v={<span className={STATUS_PILL[sub.status]}>{statusNames[sub.status]}</span>}
      />
      <SaTenantInfoRow k={t('plan.currency')} v={sub.currency} />
      <SaTenantInfoRow k={t('plan.started')} v={formatDate(sub.createdAt)} />
      <SaTenantInfoRow
        k={t('plan.trialEndsAt')}
        v={sub.trialEndsAt ? formatDate(sub.trialEndsAt) : '—'}
      />
      <SaTenantInfoRow
        k={t('plan.stripeCustomer')}
        v={sub.stripeCustomerId ?? '—'}
        mono={Boolean(sub.stripeCustomerId)}
      />
      <SaTenantInfoRow
        k={t('plan.stripeSubscription')}
        v={sub.stripeSubscriptionId ?? '—'}
        mono={Boolean(sub.stripeSubscriptionId)}
      />
    </SaTenantSection>
  );
}
