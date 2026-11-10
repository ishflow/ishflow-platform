import { JsonDiffView } from '@/components/app/super-admin/audit/json-diff-view';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getPlatformAuditEntry } from '@/platform/super-admin/list-platform-audit';
import { getSuperAdminProDict } from '@/platform/super-admin/pro-messages';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function formatTimestamp(date: Date): string {
  return new Date(date).toISOString();
}

function formatJson(value: unknown, dash: string): string {
  if (value === null || value === undefined) return dash;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell className="w-40 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </TableCell>
      <TableCell className="text-sm text-foreground">{children}</TableCell>
    </TableRow>
  );
}

function JsonBlock({ value, dash }: { value: unknown; dash: string }) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">{dash}</p>;
  }
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs leading-snug">
      {formatJson(value, dash)}
    </pre>
  );
}

export default async function SuperAdminAuditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entry, dict, proDict] = await Promise.all([
    getPlatformAuditEntry(id),
    getSuperAdminDict(),
    getSuperAdminProDict(),
  ]);
  if (!entry) notFound();

  const d = dict.audit.detail;
  const dash = dict.common.dash;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/super-admin/audit"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit -ml-2')}
        >
          {d.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{d.heading}</h1>
          <Badge variant="outline" className="font-mono">
            {entry.action}
          </Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{entry.id}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{d.metadataTitle}</CardTitle>
          <CardDescription>{d.metadataDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <MetaRow label={d.rows.when}>
                <span className="font-mono text-xs tabular-nums">
                  {formatTimestamp(entry.createdAt)}
                </span>
              </MetaRow>
              <MetaRow label={d.rows.actor}>
                <span className="font-mono text-xs">{entry.actorClerkId}</span>
              </MetaRow>
              <MetaRow label={d.rows.action}>
                <Badge variant="outline" className="font-mono">
                  {entry.action}
                </Badge>
              </MetaRow>
              <MetaRow label={d.rows.tenant}>
                {entry.tenantId ? (
                  <Link
                    href={`/super-admin/tenants/${entry.tenantId}`}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {entry.tenantName ?? entry.tenantId}{' '}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({entry.tenantId})
                    </span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{dash}</span>
                )}
              </MetaRow>
              <MetaRow label={d.rows.targetUser}>
                {entry.targetUserId ? (
                  <span className="font-mono text-xs">{entry.targetUserId}</span>
                ) : (
                  <span className="text-muted-foreground">{dash}</span>
                )}
              </MetaRow>
              <MetaRow label={d.rows.ip}>
                {entry.ip ? (
                  <span className="font-mono text-xs">{entry.ip}</span>
                ) : (
                  <span className="text-muted-foreground">{dash}</span>
                )}
              </MetaRow>
              <MetaRow label={d.rows.userAgent}>
                {entry.userAgent ? (
                  <span className="break-all text-xs text-muted-foreground">{entry.userAgent}</span>
                ) : (
                  <span className="text-muted-foreground">{dash}</span>
                )}
              </MetaRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <JsonDiffView
        before={entry.before}
        after={entry.after}
        dict={proDict.audit.diff}
        dash={dash}
      />

      <Card>
        <CardHeader>
          <CardTitle>{d.beforeTitle}</CardTitle>
          <CardDescription>{d.beforeDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <JsonBlock value={entry.before} dash={dash} />
        </CardContent>
        <Separator />
        <CardHeader>
          <CardTitle>{d.afterTitle}</CardTitle>
          <CardDescription>{d.afterDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <JsonBlock value={entry.after} dash={dash} />
        </CardContent>
      </Card>
    </div>
  );
}
