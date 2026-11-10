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
import type { UserDetailPushToken } from '@/platform/super-admin/user-detail/load-user-detail';
import Link from 'next/link';

function formatTimestamp(date: Date): string {
  return new Date(date).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

interface UserPushTokensCardProps {
  tokens: UserDetailPushToken[];
  dict: SuperAdminProDict['users']['detail']['pushTokens'];
  dash: string;
}

export function UserPushTokensCard({ tokens, dict, dash }: UserPushTokensCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{dict.title.replace('{count}', String(tokens.length))}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      {tokens.length === 0 ? (
        <CardHeader>
          <CardDescription>{dict.empty}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[12%]">{dict.columns.platform}</TableHead>
              <TableHead>{dict.columns.device}</TableHead>
              <TableHead className="w-[22%]">{dict.columns.created}</TableHead>
              <TableHead className="w-[22%]">{dict.columns.lastUsed}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {t.platform}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">{t.deviceName ?? dash}</span>
                    {t.tenantName ? (
                      <Link
                        href={`/super-admin/tenants/${t.tenantId}`}
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {t.tenantName}
                      </Link>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatTimestamp(t.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatTimestamp(t.lastUsedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
