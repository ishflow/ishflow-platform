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
import type { UserDetailMembership } from '@/platform/super-admin/user-detail/load-user-detail';
import Link from 'next/link';

function formatTimestamp(date: Date): string {
  return new Date(date).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

interface UserMembershipsCardProps {
  memberships: UserDetailMembership[];
  dict: SuperAdminProDict['users']['detail']['memberships'];
  emptyText: string;
}

export function UserMembershipsCard({ memberships, dict, emptyText }: UserMembershipsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{dict.title.replace('{count}', String(memberships.length))}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      {memberships.length === 0 ? (
        <CardHeader>
          <CardDescription>{emptyText}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.columns.tenant}</TableHead>
              <TableHead>{dict.columns.roles}</TableHead>
              <TableHead className="w-[180px]">{dict.columns.joined}</TableHead>
              <TableHead className="w-[180px] text-right">{dict.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((m) => (
              <TableRow key={m.membershipId}>
                <TableCell>
                  <Link
                    href={`/super-admin/tenants/${m.tenantId}`}
                    className="text-sm text-foreground underline-offset-4 hover:underline"
                  >
                    {m.tenantName}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">{m.tenantSlug}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {m.roleNames.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      m.roleNames.map((r) => (
                        <Badge key={r} variant="secondary" className="text-xs">
                          {r}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatTimestamp(m.joinedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <form
                    method="POST"
                    action={`/super-admin/tenants/${m.tenantId}/impersonate/start`}
                  >
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {dict.impersonate}
                    </button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
