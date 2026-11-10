import { BillingEventTimeline } from '@/components/app/super-admin/billing-event-timeline';
import { ManualUpgradeForm } from '@/components/app/super-admin/manual-upgrade-form';
import { PlanLimitOverrides } from '@/components/app/super-admin/plan-limit-overrides';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { withBypass } from '@/platform/db/tenant-context';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { notFound } from 'next/navigation';
import { createPlanLimitOverride, deletePlanLimitOverride, manualPlanChange } from './actions';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = 'force-dynamic';

function formatDate(value: Date | null, dash: string): string {
  if (!value) return dash;
  return value.toISOString().slice(0, 10);
}

export default async function TenantSubscriptionPage({ params }: PageProps) {
  const { tenantId } = await params;

  const [data, dict] = await Promise.all([
    withBypass(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          status: true,
          currency: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          trialEndsAt: true,
          createdAt: true,
        },
      });
      if (!tenant) return null;
      const [billingEvents, overrides] = await Promise.all([
        tx.billingEvent.findMany({
          where: { tenantId },
          orderBy: [{ processedAt: 'desc' }, { createdAt: 'desc' }],
          take: 100,
        }),
        tx.planLimitOverride.findMany({
          where: { tenantId },
          orderBy: { key: 'asc' },
        }),
      ]);
      return { tenant, billingEvents, overrides };
    }),
    getSuperAdminDict(),
  ]);

  if (!data) notFound();
  const { tenant, billingEvents, overrides } = data;
  const td = dict.tenantDetail.subscription;
  const cs = td.currentState;
  const dash = dict.common.dash;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{td.title}</h1>
        <p className="text-sm text-muted-foreground">
          {tenant.name} <span className="font-mono text-xs">({tenant.slug})</span>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ManualUpgradeForm
            tenantId={tenant.id}
            currentPlan={tenant.plan}
            currentStatus={tenant.status}
            action={manualPlanChange}
            dict={{
              manualUpgrade: dict.subscription.manualUpgrade,
              planOptions: dict.subscription.planOptions,
              statusOptions: dict.subscription.statusOptions,
            }}
          />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{cs.title}</CardTitle>
              <CardDescription>{cs.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.plan}
                  </dt>
                  <dd>
                    <Badge variant="secondary">{dict.subscription.planOptions[tenant.plan]}</Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.status}
                  </dt>
                  <dd>
                    <Badge variant="outline">
                      {dict.subscription.statusOptions[tenant.status]}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.currency}
                  </dt>
                  <dd className="text-sm tabular-nums">{tenant.currency}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.trialEnds}
                  </dt>
                  <dd className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(tenant.trialEndsAt, dash)}
                  </dd>
                </div>
                <Separator />
                <div className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.stripeCustomer}
                  </dt>
                  <dd className="truncate font-mono text-xs" title={tenant.stripeCustomerId ?? ''}>
                    {tenant.stripeCustomerId ?? dash}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.stripeSubscription}
                  </dt>
                  <dd
                    className="truncate font-mono text-xs"
                    title={tenant.stripeSubscriptionId ?? ''}
                  >
                    {tenant.stripeSubscriptionId ?? dash}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <PlanLimitOverrides
            tenantId={tenant.id}
            overrides={overrides}
            createAction={createPlanLimitOverride}
            deleteAction={deletePlanLimitOverride}
            dict={{ ...dict.subscription.overrides, delete: dict.common.delete, dash }}
          />
        </div>
      </div>

      <BillingEventTimeline events={billingEvents} dict={dict.subscription.timeline} />
    </div>
  );
}
