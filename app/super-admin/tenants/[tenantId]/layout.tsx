import { TenantTabNav } from '@/components/app/super-admin/tenant-tab-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TenantStatus } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusVariant(status: TenantStatus): BadgeVariant {
  switch (status) {
    case 'active':
      return 'default';
    case 'trialing':
      return 'secondary';
    case 'past_due':
      return 'destructive';
    case 'suspended':
    case 'cancelled':
      return 'outline';
    default:
      return 'secondary';
  }
}

function formatDate(value: Date | null | undefined, dash: string): string {
  if (!value) return dash;
  return value.toISOString().slice(0, 10);
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [overview, dict, proDict] = await Promise.all([
    getTenantOverview(tenantId),
    getSuperAdminDict(),
    getTenantProDict(),
  ]);
  if (!overview) notFound();

  const { tenant } = overview;
  const td = dict.tenantDetail;
  const extraTabs = [
    { slug: 'timeline', label: proDict.tabs.timeline },
    { slug: 'vitals', label: proDict.tabs.vitals },
    { slug: 'tags', label: proDict.tabs.tags },
    { slug: 'notes', label: proDict.tabs.notes },
    { slug: 'overrides', label: proDict.tabs.overrides },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
            <Badge>{dict.subscription.planOptions[tenant.plan]}</Badge>
            <Badge variant={statusVariant(tenant.status)}>
              {dict.subscription.statusOptions[tenant.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{tenant.slug}</span> · {tenant.currency} · {td.createdLabel}{' '}
            {formatDate(tenant.createdAt, dict.common.dash)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="POST" action={`/super-admin/tenants/${tenantId}/impersonate/start`}>
            <Button type="submit" variant="outline">
              {td.impersonate}
            </Button>
          </form>
          <Button render={<Link href={`/super-admin/tenants/${tenantId}/subscription`} />}>
            {td.manageSubscription}
          </Button>
        </div>
      </header>
      <TenantTabNav tenantId={tenantId} dict={td.tabs} extraTabs={extraTabs} />
      {children}
    </div>
  );
}
