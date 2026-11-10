import { PlanDistributionChart } from '@/components/app/super-admin/plan-distribution-chart';
import { StatCard } from '@/components/app/super-admin/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getRevenueSnapshot } from '@/platform/super-admin/revenue';
import { DollarSign, Percent, TrendingDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat('en-US');

function fmtPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export default async function RevenuePage() {
  const [snapshot, dict] = await Promise.all([getRevenueSnapshot(), getSuperAdminDict()]);
  const r = dict.revenue;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
        <p className="text-sm text-muted-foreground">{r.subtitle}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={r.kpis.totalMrr.label}
          value={USD.format(snapshot.totalMrrUsd)}
          hint={r.kpis.totalMrr.hint}
          icon={DollarSign}
        />
        <StatCard
          label={r.kpis.churn30d.label}
          value={intFormatter.format(snapshot.churn30d)}
          hint={r.kpis.churn30d.hint}
          icon={TrendingDown}
        />
        <StatCard
          label={r.kpis.trialConversion30d.label}
          value={fmtPct(snapshot.trialConversion30d)}
          hint={r.kpis.trialConversion30d.hint}
          icon={Percent}
        />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{r.planDistribution.title}</CardTitle>
            <CardDescription>{r.planDistribution.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanDistributionChart
              planDistribution={snapshot.planDistribution}
              labels={r.planLabels}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
