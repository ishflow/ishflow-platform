import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AuditProRow } from '@/platform/super-admin/audit-pro/list-audit-pro';
import type { SavedFilterCriteria } from '@/platform/super-admin/audit-pro/saved-filters';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import Link from 'next/link';

function actionBadgeClass(action: string): string {
  if (action.startsWith('plan.') || action.startsWith('billing.')) {
    return 'border-transparent bg-primary/10 text-primary';
  }
  if (action.startsWith('gate.') || action.startsWith('system.')) {
    return 'border-transparent bg-accent text-accent-foreground';
  }
  if (action.startsWith('impersonate.') || action.startsWith('view_as.')) {
    return 'border-transparent bg-destructive/10 text-destructive';
  }
  return '';
}

function truncate(value: string, max = 22): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function formatTimestamp(date: Date): string {
  return new Date(date).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

interface AuditProTableProps {
  rows: ReadonlyArray<AuditProRow>;
  nextCursor: string | null;
  filters: SavedFilterCriteria & { cursor?: string };
  dict: SuperAdminDict;
}

export function AuditProTable({ rows, nextCursor, filters, dict }: AuditProTableProps) {
  const a = dict.audit;

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{a.emptyTitle}</CardTitle>
          <CardDescription>{a.emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">{a.columns.when}</TableHead>
              <TableHead className="w-[18%]">{a.columns.actor}</TableHead>
              <TableHead className="w-[24%]">{a.columns.action}</TableHead>
              <TableHead className="w-[26%]">{a.columns.tenant}</TableHead>
              <TableHead className="w-[12%] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatTimestamp(row.createdAt)}
                </TableCell>
                <TableCell
                  className="font-mono text-xs text-muted-foreground"
                  title={row.actorClerkId}
                >
                  {truncate(row.actorClerkId, 18)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="outline"
                      className={cn('font-mono w-fit', actionBadgeClass(row.action))}
                    >
                      {row.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{row.entity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {row.tenantId ? (
                    <Link
                      href={`/super-admin/tenants/${row.tenantId}`}
                      className="text-sm text-foreground underline-offset-4 hover:underline"
                    >
                      {row.tenantName ?? truncate(row.tenantId, 18)}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">{dict.common.dash}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/super-admin/audit/${row.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    {dict.common.view}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={buildHref(filters, nextCursor)}
            className={buttonVariants({ variant: 'outline' })}
          >
            {a.loadMore}
          </Link>
        </div>
      ) : null}
    </>
  );
}

function buildHref(filters: SavedFilterCriteria, cursor: string): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (typeof v === 'string' && v.trim()) params.set(k, v.trim());
  }
  params.set('cursor', cursor);
  return `/super-admin/audit?${params.toString()}`;
}
