import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatCard } from '@/components/app/super-admin/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Eye, MousePointerClick, Repeat, Users } from 'lucide-react';

import { withBypass } from '@/platform/db/tenant-context';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';

export const dynamic = 'force-dynamic';

const pctFmt = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat('en-US');

interface TenantBreakdown {
  tenantId: string | null;
  tenantName: string;
  impressions: number;
  viewed: number;
  clicked: number;
}

export default async function AnnouncementAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dict = await getSuperAdminDict();
  const t = dict.communications;

  const data = await withBypass(async (tx) => {
    const row = await tx.marketingAnnouncement.findUnique({ where: { id } });
    if (!row) return null;
    const states = await tx.userAnnouncementState.findMany({
      where: { announcementId: id },
    });

    const totalImpressions = states.reduce((sum, s) => sum + s.impressionCount, 0);
    const uniqueViewers = states.filter((s) => s.viewedAt !== null).length;
    const dismissed = states.filter((s) => s.dismissedAt !== null).length;
    const clicked = states.filter((s) => s.clickedThroughAt !== null).length;
    const dismissalRate = uniqueViewers > 0 ? dismissed / uniqueViewers : 0;
    const ctr = uniqueViewers > 0 ? clicked / uniqueViewers : 0;

    // Per-tenant breakdown: join states.userId → user.memberships.tenant.
    const userIds = Array.from(new Set(states.map((s) => s.userId)));
    let perTenant: TenantBreakdown[] = [];
    if (userIds.length > 0) {
      const memberships = await tx.membership.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          tenantId: true,
          tenant: { select: { name: true } },
        },
      });
      // Map userId → primary tenant (first row is fine for analytics rollup).
      const userToTenant = new Map<string, { id: string; name: string }>();
      for (const m of memberships) {
        if (!userToTenant.has(m.userId)) {
          userToTenant.set(m.userId, { id: m.tenantId, name: m.tenant.name });
        }
      }
      const buckets = new Map<string, TenantBreakdown>();
      for (const s of states) {
        const tenant = userToTenant.get(s.userId);
        const key = tenant?.id ?? '__none__';
        const existing = buckets.get(key) ?? {
          tenantId: tenant?.id ?? null,
          tenantName: tenant?.name ?? '—',
          impressions: 0,
          viewed: 0,
          clicked: 0,
        };
        existing.impressions += s.impressionCount;
        if (s.viewedAt) existing.viewed += 1;
        if (s.clickedThroughAt) existing.clicked += 1;
        buckets.set(key, existing);
      }
      perTenant = Array.from(buckets.values())
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);
    }

    return { row, totalImpressions, uniqueViewers, dismissalRate, ctr, perTenant };
  });

  if (!data) notFound();
  const { row, totalImpressions, uniqueViewers, dismissalRate, ctr, perTenant } = data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          render={<Link href={`/super-admin/communications/${id}`} />}
        >
          <ChevronLeft className="size-4" />
          {row.internalKey}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t.analytics.title}</h1>
        <p className="text-sm text-muted-foreground">{t.analytics.description}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.analytics.impressions}
          value={intFmt.format(totalImpressions)}
          icon={Eye}
        />
        <StatCard
          label={t.analytics.uniqueViewers}
          value={intFmt.format(uniqueViewers)}
          icon={Users}
        />
        <StatCard
          label={t.analytics.dismissalRate}
          value={pctFmt.format(dismissalRate)}
          icon={Repeat}
        />
        <StatCard label={t.analytics.ctr} value={pctFmt.format(ctr)} icon={MousePointerClick} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t.analytics.perTenantTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.analytics.perTenantDescription}</p>
        </CardHeader>
        <CardContent className="p-0">
          {perTenant.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">{t.analytics.perTenantEmpty}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.analytics.columns.tenant}</th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t.analytics.columns.impressions}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">{t.analytics.columns.viewed}</th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t.analytics.columns.clicked}
                  </th>
                </tr>
              </thead>
              <tbody>
                {perTenant.map((row, idx) => (
                  <tr key={row.tenantId ?? `none-${idx}`} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {row.tenantId ? (
                        <Link
                          href={`/super-admin/tenants/${row.tenantId}`}
                          className="hover:underline"
                        >
                          {row.tenantName}
                        </Link>
                      ) : (
                        row.tenantName
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{intFmt.format(row.impressions)}</td>
                    <td className="px-3 py-2 text-right">{intFmt.format(row.viewed)}</td>
                    <td className="px-3 py-2 text-right">{intFmt.format(row.clicked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
