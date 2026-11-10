'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { UserDetailSession } from '@/platform/super-admin/user-detail/load-user-detail';
import { useTransition } from 'react';
import { toast } from 'sonner';

function formatEpochMs(ms: number | null): string {
  if (ms == null) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

function statusVariant(status: string): 'secondary' | 'outline' | 'destructive' {
  if (status === 'active') return 'secondary';
  if (status === 'ended' || status === 'revoked' || status === 'expired') return 'outline';
  return 'destructive';
}

interface UserSessionsCardProps {
  sessions: UserDetailSession[];
  errorLoading: boolean;
  dict: SuperAdminProDict['users']['detail']['sessions'];
  errorLabel: string;
  revokeOneAction: (sessionId: string) => Promise<{ ok: boolean; message?: string }>;
  revokeAllAction: () => Promise<{ ok: boolean; revoked: number; message?: string }>;
}

export function UserSessionsCard({
  sessions,
  errorLoading,
  dict,
  errorLabel,
  revokeOneAction,
  revokeAllAction,
}: UserSessionsCardProps) {
  const [pending, startTransition] = useTransition();

  const handleRevokeAll = () => {
    startTransition(async () => {
      const res = await revokeAllAction();
      if (res.ok) {
        toast.success(`${res.revoked} ✓`);
      } else {
        toast.error(res.message ?? errorLabel);
      }
    });
  };
  const handleRevokeOne = (sessionId: string) => {
    startTransition(async () => {
      const res = await revokeOneAction(sessionId);
      if (res.ok) {
        toast.success('✓');
      } else {
        toast.error(res.message ?? errorLabel);
      }
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{dict.title.replace('{count}', String(sessions.length))}</CardTitle>
            <CardDescription>{dict.description}</CardDescription>
          </div>
          {sessions.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAll}
              disabled={pending}
              className="shrink-0"
            >
              {dict.revokeAll}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      {errorLoading ? (
        <CardHeader>
          <CardDescription className="text-destructive">{errorLabel}</CardDescription>
        </CardHeader>
      ) : sessions.length === 0 ? (
        <CardHeader>
          <CardDescription>{dict.empty}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">{dict.columns.id}</TableHead>
              <TableHead className="w-[18%]">{dict.columns.status}</TableHead>
              <TableHead className="w-[20%]">{dict.columns.lastActive}</TableHead>
              <TableHead className="w-[20%]">{dict.columns.expires}</TableHead>
              <TableHead className="w-[14%] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.id}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(s.status)} className="font-mono text-xs">
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatEpochMs(s.lastActiveAt)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatEpochMs(s.expireAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeOne(s.id)}
                    disabled={pending || s.status !== 'active'}
                  >
                    {dict.revoke}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
