import { AddonAdoptionCard } from '@/components/app/super-admin/analytics/addon-adoption-card';
import { CohortCard } from '@/components/app/super-admin/analytics/cohort-card';
import { EngagementCard } from '@/components/app/super-admin/analytics/engagement-card';
import { FunnelCard } from '@/components/app/super-admin/analytics/funnel-card';
import {
  TopCustomersCard,
  TopProductsCard,
} from '@/components/app/super-admin/analytics/top-aggregates-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { computeAddonAdoption } from '@/platform/super-admin/analytics/addon-adoption';
import { computeCohortRetention } from '@/platform/super-admin/analytics/cohort';
import { computeEngagement } from '@/platform/super-admin/analytics/engagement';
import { computeFunnel } from '@/platform/super-admin/analytics/funnel';
import {
  computeTopCustomers,
  computeTopProducts,
} from '@/platform/super-admin/analytics/top-aggregates';
import { getSuperAdminProDict } from '@/platform/super-admin/pro-messages';

export const dynamic = 'force-dynamic';

export default async function SuperAdminAnalyticsPage() {
  const [engagement, cohort, funnel, adoption, topProducts, topCustomers, proDict] =
    await Promise.all([
      computeEngagement(),
      computeCohortRetention(),
      computeFunnel(),
      computeAddonAdoption(),
      computeTopProducts(),
      computeTopCustomers(),
      getSuperAdminProDict(),
    ]);
  const d = proDict.analytics;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </header>

      <Alert>
        <AlertDescription>{d.privacyNotice}</AlertDescription>
      </Alert>

      <EngagementCard
        dau={engagement.dau}
        wau={engagement.wau}
        mau={engagement.mau}
        daily={engagement.daily}
        dict={d.dau}
      />

      <FunnelCard counts={funnel} dict={d.funnel} />

      <CohortCard rows={cohort} dict={d.cohort} />

      <AddonAdoptionCard rows={adoption.rows} total={adoption.total} dict={d.addonAdoption} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsCard rows={topProducts} dict={d.topProducts} />
        <TopCustomersCard rows={topCustomers} dict={d.topCustomers} />
      </div>
    </div>
  );
}
