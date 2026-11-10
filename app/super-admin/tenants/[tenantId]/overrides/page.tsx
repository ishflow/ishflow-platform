import { PlanLimitOverrides } from '@/components/app/super-admin/plan-limit-overrides';
import { FeatureKillPanel } from '@/components/app/super-admin/tenants/feature-kill-panel';
import { PriceOverridePanel } from '@/components/app/super-admin/tenants/price-override-panel';
import { withBypass } from '@/platform/db/tenant-context';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import {
  getTenantPriceOverride,
  listTenantFeatureKills,
} from '@/platform/super-admin/tenants/overrides';
import { notFound } from 'next/navigation';
import {
  addFeatureKillAction,
  removeFeatureKillAction,
  removePriceOverrideAction,
  savePriceOverrideAction,
} from '../_actions/overrides';
import { createPlanLimitOverride, deletePlanLimitOverride } from '../subscription/actions';

export const dynamic = 'force-dynamic';

export default async function TenantOverridesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [overview, baseDict, proDict, planLimitOverrides, priceOverride, featureKills] =
    await Promise.all([
      getTenantOverview(tenantId),
      getSuperAdminDict(),
      getTenantProDict(),
      withBypass((tx) =>
        tx.planLimitOverride.findMany({
          where: { tenantId },
          orderBy: { key: 'asc' },
        }),
      ),
      getTenantPriceOverride(tenantId),
      listTenantFeatureKills(tenantId),
    ]);
  if (!overview) notFound();

  const o = proDict.overrides;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold">{o.title}</h2>
        <p className="text-sm text-muted-foreground">{o.description}</p>
      </header>

      <PlanLimitOverrides
        tenantId={tenantId}
        overrides={planLimitOverrides}
        createAction={createPlanLimitOverride}
        deleteAction={deletePlanLimitOverride}
        dict={{
          ...baseDict.subscription.overrides,
          delete: baseDict.common.delete,
          dash: baseDict.common.dash,
        }}
      />

      <PriceOverridePanel
        tenantId={tenantId}
        override={priceOverride}
        dict={o.priceOverride}
        saveAction={savePriceOverrideAction}
        removeAction={removePriceOverrideAction}
      />

      <FeatureKillPanel
        tenantId={tenantId}
        kills={featureKills}
        dict={o.featureKill}
        addAction={addFeatureKillAction}
        removeAction={removeFeatureKillAction}
      />
    </div>
  );
}
