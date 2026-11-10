import { StatCard } from '@/components/app/super-admin/stat-card';
import { VitalsDocChart } from '@/components/app/super-admin/tenants/vitals-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import { type VitalsWindow, getTenantVitals } from '@/platform/super-admin/tenants/vitals';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function parseWindow(raw: string | string[] | undefined): VitalsWindow {
  const v = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (v === '90') return 90;
  if (v === '365') return 365;
  return 30;
}

export default async function TenantVitalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const [{ tenantId }, search, dict] = await Promise.all([
    params,
    searchParams,
    getTenantProDict(),
  ]);
  const window = parseWindow(search.window);
  const [overview, vitals] = await Promise.all([
    getTenantOverview(tenantId),
    getTenantVitals(tenantId, window),
  ]);
  if (!overview) notFound();

  const v = dict.vitals;
  const formatMoney = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{v.title}</h2>
          <p className="text-sm text-muted-foreground">{v.description}</p>
        </div>
        <Tabs value={String(window)}>
          <TabsList variant="line">
            {([30, 90, 365] as const).map((w) => (
              <TabsTrigger
                key={w}
                value={String(w)}
                render={
                  <Link
                    href={`/super-admin/tenants/${tenantId}/vitals?window=${w}`}
                    scroll={false}
                  />
                }
              >
                {v.windows[String(w) as '30' | '90' | '365']}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={v.cards.docs.label}
          value={vitals.totalDocs.toLocaleString()}
          hint={v.cards.docs.hint}
        />
        <StatCard
          label={v.cards.users.label}
          value={vitals.userCount.toString()}
          hint={v.cards.users.hint}
        />
        <StatCard
          label={v.cards.ar.label}
          value={formatMoney(vitals.accountsReceivable)}
          hint={v.cards.ar.hint}
        />
        <StatCard
          label={v.cards.errors.label}
          value={vitals.errorRate.toString()}
          hint={v.cards.errors.hint}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{v.chart.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {vitals.docCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{v.chart.empty}</p>
          ) : (
            <VitalsDocChart data={[...vitals.docCounts]} label={v.cards.docs.label} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{v.topCustomers.title}</CardTitle>
            <CardDescription>{`${vitals.window}d`}</CardDescription>
          </CardHeader>
          <CardContent>
            {vitals.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{v.topCustomers.empty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{v.topCustomers.columns.name}</TableHead>
                    <TableHead className="text-right">{v.topCustomers.columns.total}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vitals.topCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(c.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{v.topProducts.title}</CardTitle>
            <CardDescription>{`${vitals.window}d`}</CardDescription>
          </CardHeader>
          <CardContent>
            {vitals.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{v.topProducts.empty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{v.topProducts.columns.name}</TableHead>
                    <TableHead className="text-right">{v.topProducts.columns.total}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vitals.topProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(p.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
