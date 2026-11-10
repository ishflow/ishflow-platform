import type { AnnouncementStatus } from '@prisma/client';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

import { withBypass } from '@/platform/db/tenant-context';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';

export const dynamic = 'force-dynamic';

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const STATUS_VALUES: AnnouncementStatus[] = ['draft', 'scheduled', 'live', 'archived'];

function isStatus(raw: string | undefined): raw is AnnouncementStatus {
  return raw !== undefined && (STATUS_VALUES as string[]).includes(raw);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function fmtDate(d: Date | null): string {
  return d ? dateFmt.format(d) : '—';
}

export default async function CommunicationsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter = pickFirst(sp.status);
  const status = isStatus(statusFilter) ? statusFilter : undefined;

  const [items, dict] = await Promise.all([
    withBypass((tx) =>
      tx.marketingAnnouncement.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ),
    getSuperAdminDict(),
  ]);

  const t = dict.communications;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button render={<Link href="/super-admin/communications/new" />}>
          <Plus className="size-4" />
          {t.actions.new}
        </Button>
      </header>

      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/super-admin/communications"
          className={`rounded-md border px-2.5 py-1 ${status === undefined ? 'border-foreground bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          {t.filters.allStatuses}
        </Link>
        {STATUS_VALUES.map((s) => (
          <Link
            key={s}
            href={`/super-admin/communications?status=${s}`}
            className={`rounded-md border px-2.5 py-1 ${status === s ? 'border-foreground bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            {t.statuses[s]}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.list.empty}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.list.emptyDescription}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t.columns.internalKey}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.surface}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.status}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.startAt}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.endAt}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.createdAt}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link
                        href={`/super-admin/communications/${row.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {row.internalKey}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.surfaces[row.surface]}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.status === 'live' ? 'default' : 'outline'}>
                        {t.statuses[row.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(row.startAt)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(row.endAt)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
