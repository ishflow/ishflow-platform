'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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

import type { ApiKeyAuditRow } from '@/platform/super-admin/system/api-keys';

function formatTimestamp(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

interface ApiKeysTableProps {
  rows: ReadonlyArray<ApiKeyAuditRow>;
  onRevoke: (formData: FormData) => Promise<void>;
  labels: {
    tableTitle: string;
    tenantColumn: string;
    nameColumn: string;
    prefixColumn: string;
    scopeColumn: string;
    createdAtColumn: string;
    createdByColumn: string;
    lastUsedColumn: string;
    statusColumn: string;
    active: string;
    revoked: string;
    neverUsed: string;
    revoke: string;
    empty: string;
    confirmRevokeTitle: string;
    confirmRevokeBody: string;
    confirmRevokeYes: string;
    confirmRevokeCancel: string;
  };
}

function RevokeButton({
  row,
  onRevoke,
  labels,
}: {
  row: ApiKeyAuditRow;
  onRevoke: ApiKeysTableProps['onRevoke'];
  labels: ApiKeysTableProps['labels'];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  function confirm() {
    const fd = new FormData();
    fd.set('apiKeyId', row.id);
    setOpen(false);
    startTransition(async () => {
      await onRevoke(fd);
    });
  }
  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={pending || row.revokedAt !== null}
      >
        {labels.revoke}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.confirmRevokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{labels.confirmRevokeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.confirmRevokeCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>{labels.confirmRevokeYes}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ApiKeysTable({ rows, onRevoke, labels }: ApiKeysTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{labels.tableTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">{labels.empty}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.tenantColumn}</TableHead>
                <TableHead>{labels.nameColumn}</TableHead>
                <TableHead>{labels.prefixColumn}</TableHead>
                <TableHead>{labels.scopeColumn}</TableHead>
                <TableHead>{labels.createdAtColumn}</TableHead>
                <TableHead>{labels.createdByColumn}</TableHead>
                <TableHead>{labels.lastUsedColumn}</TableHead>
                <TableHead>{labels.statusColumn}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/super-admin/tenants/${row.tenantId}`}
                      className="text-sm text-foreground underline-offset-4 hover:underline"
                    >
                      {row.tenantName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.keyPrefix}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {row.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatTimestamp(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.createdBy.email}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {row.lastUsedAt ? formatTimestamp(row.lastUsedAt) : labels.neverUsed}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.revokedAt ? 'destructive' : 'outline'} className="text-xs">
                      {row.revokedAt ? labels.revoked : labels.active}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RevokeButton row={row} onRevoke={onRevoke} labels={labels} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
