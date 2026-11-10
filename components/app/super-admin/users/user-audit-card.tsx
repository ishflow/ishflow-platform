import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SuperAdminProDict } from '@/platform/super-admin/pro-messages';
import type { UserDetailAuditEntry } from '@/platform/super-admin/user-detail/load-user-detail';
import Link from 'next/link';

function formatTimestamp(date: Date): string {
  return new Date(date).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

interface UserAuditCardProps {
  rows: UserDetailAuditEntry[];
  dict: SuperAdminProDict['users']['detail']['audit'];
  dash: string;
}

export function UserAuditCard({ rows, dict, dash }: UserAuditCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{dict.title.replace('{count}', String(rows.length))}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <CardHeader>
          <CardDescription>{dict.empty}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{dict.columns.when}</TableHead>
              <TableHead>{dict.columns.action}</TableHead>
              <TableHead>{dict.columns.tenant}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  <Link
                    href={`/super-admin/audit/${row.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {formatTimestamp(row.createdAt)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {row.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.tenantId ? (
                    <Link
                      href={`/super-admin/tenants/${row.tenantId}`}
                      className="text-sm text-foreground underline-offset-4 hover:underline"
                    >
                      {row.tenantName ?? row.tenantId}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">{dash}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
