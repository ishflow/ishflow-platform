import { StatCard } from '@/components/app/super-admin/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats } from '@/platform/super-admin/dashboard-stats';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  Building2,
  DollarSign,
  ListChecks,
  ShieldCheck,
  TrendingDown,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat('en-US');

interface HealthCheck {
  label: string;
  configured: boolean;
}

function getConsoleHealth(labels: {
  stripeSecret: string;
  stripeWebhook: string;
  resendApi: string;
}): ReadonlyArray<HealthCheck> {
  return [
    { label: labels.stripeSecret, configured: Boolean(process.env.STRIPE_SECRET_KEY) },
    { label: labels.stripeWebhook, configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET) },
    { label: labels.resendApi, configured: Boolean(process.env.RESEND_API_KEY) },
  ];
}

export default async function SuperAdminDashboardPage() {
  const stats = await getDashboardStats();
  const dict = await getSuperAdminDict();
  const d = dict.dashboard;
  const health = getConsoleHealth(d.health);

  const quickLinks = [
    { href: '/super-admin/tenants', ...d.quickLinks.items.tenants },
    { href: '/super-admin/revenue', ...d.quickLinks.items.revenue },
    { href: '/super-admin/audit', ...d.quickLinks.items.audit },
    { href: '/super-admin/billing', ...d.quickLinks.items.billing },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={d.kpis.tenants.label}
          value={intFormatter.format(stats.tenantCount)}
          hint={d.kpis.tenants.hint}
          icon={Building2}
        />
        <StatCard
          label={d.kpis.active.label}
          value={`${intFormatter.format(stats.activeTenants)} / ${intFormatter.format(stats.tenantCount)}`}
          hint={d.trialingHint.replace('{count}', intFormatter.format(stats.trialingTenants))}
          icon={Activity}
        />
        <StatCard
          label={d.kpis.mrr.label}
          value={usdFormatter.format(stats.mrrUsd)}
          hint={d.kpis.mrr.hint}
          icon={DollarSign}
        />
        <StatCard
          label={d.kpis.activeUsers.label}
          value={intFormatter.format(stats.activeUsers30d)}
          hint={d.kpis.activeUsers.hint}
          icon={Users}
        />
        <StatCard
          label={d.kpis.churn.label}
          value={intFormatter.format(stats.churn30d)}
          hint={d.kpis.churn.hint}
          icon={TrendingDown}
        />
        <StatCard
          label={d.kpis.planMix.label}
          value={d.planMixValue.replace('{count}', intFormatter.format(stats.paidTenants))}
          hint={d.kpis.planMix.hint}
          icon={BarChart3}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{d.quickLinks.title}</CardTitle>
            <CardDescription>{d.quickLinks.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <Button
                  key={link.href}
                  variant="outline"
                  size="lg"
                  className="h-auto justify-between gap-3 px-3 py-3 text-left"
                  render={<Link href={link.href} />}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{link.label}</span>
                    <span className="text-xs text-muted-foreground">{link.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {d.health.title}
            </CardTitle>
            <CardDescription>{d.health.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {health.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    {row.label === d.health.resendApi ? (
                      <ListChecks className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                    )}
                    {row.label}
                  </span>
                  <Badge variant={row.configured ? 'outline' : 'destructive'}>
                    {row.configured ? dict.common.configured : dict.common.missing}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
