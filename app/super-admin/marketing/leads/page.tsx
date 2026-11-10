import { LeadStatusSelect } from '@/components/app/super-admin/marketing/lead-status-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import {
  LEAD_STATUSES,
  type LeadStatus,
  listMarketingLeads,
} from '@/platform/super-admin/marketing';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MarketingLeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dict = await getSuperAdminDict();
  const m = dict.marketing.leads;
  const leads = await listMarketingLeads({ status: params.status });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.subtitle}</p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{m.title}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={!params.status ? 'default' : 'outline'}
              render={<Link href="/super-admin/marketing/leads" />}
            >
              {m.filterAll}
            </Button>
            {LEAD_STATUSES.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={params.status === status ? 'default' : 'outline'}
                render={<Link href={`/super-admin/marketing/leads?status=${status}`} />}
              >
                {m.statusLabels[status as LeadStatus]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.columns.when}</TableHead>
                <TableHead>{m.columns.name}</TableHead>
                <TableHead>{m.columns.email}</TableHead>
                <TableHead>{m.columns.company}</TableHead>
                <TableHead>{m.columns.source}</TableHead>
                <TableHead>{m.columns.message}</TableHead>
                <TableHead>{m.columns.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    {m.empty}
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {l.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                    </TableCell>
                    <TableCell className="text-sm">{l.name}</TableCell>
                    <TableCell className="text-sm font-mono">{l.email}</TableCell>
                    <TableCell className="text-sm">{l.company ?? dict.common.dash}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {l.source ?? dict.common.dash}
                    </TableCell>
                    <TableCell className="max-w-md text-sm">
                      <p className="line-clamp-2">{l.message}</p>
                    </TableCell>
                    <TableCell>
                      <LeadStatusSelect id={l.id} current={l.status} dict={m} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
