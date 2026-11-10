'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type {
  DevicePushTokenRow,
} from '@/platform/super-admin/mobile/device-push-tokens';
import type { SendTestPushResult } from '@/app/super-admin/mobile/actions';

interface PushTokensTableProps {
  rows: ReadonlyArray<DevicePushTokenRow>;
  nextCursor: string | null;
  filterTenantId: string;
  onSendTest: (formData: FormData) => Promise<SendTestPushResult>;
  labels: {
    title: string;
    description: string;
    filterTenant: string;
    apply: string;
    reset: string;
    tenantColumn: string;
    userColumn: string;
    platformColumn: string;
    deviceColumn: string;
    tokenColumn: string;
    createdAtColumn: string;
    lastUsedColumn: string;
    sendTest: string;
    empty: string;
    loadMore: string;
    testTitle: string;
    testDescription: string;
    testTitleField: string;
    testBodyField: string;
    testTitleDefault: string;
    testBodyDefault: string;
    testSend: string;
    testCancel: string;
    testSentToast: string;
    testFailedToast: string;
  };
}

function formatTimestamp(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

function buildHref(filterTenantId: string, cursor?: string): string {
  const params = new URLSearchParams();
  if (filterTenantId) params.set('tenantId', filterTenantId);
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  return qs ? `/super-admin/mobile?${qs}` : '/super-admin/mobile';
}

function SendTestDialog({
  row,
  onSendTest,
  labels,
}: {
  row: DevicePushTokenRow;
  onSendTest: PushTokensTableProps['onSendTest'];
  labels: PushTokensTableProps['labels'];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(labels.testTitleDefault);
  const [body, setBody] = useState(labels.testBodyDefault);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const fd = new FormData();
    fd.set('tokenId', row.id);
    fd.set('title', title);
    fd.set('body', body);
    setMessage(null);
    startTransition(async () => {
      const result = await onSendTest(fd);
      if (result.ok) {
        setMessage({ kind: 'success', text: labels.testSentToast });
      } else {
        setMessage({
          kind: 'error',
          text: `${labels.testFailedToast} ${result.error ?? ''}`.trim(),
        });
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {labels.sendTest}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.testTitle}</DialogTitle>
            <DialogDescription>{labels.testDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`title-${row.id}`}>{labels.testTitleField}</Label>
              <Input
                id={`title-${row.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`body-${row.id}`}>{labels.testBodyField}</Label>
              <Input
                id={`body-${row.id}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            {message ? (
              <p
                className={
                  message.kind === 'success'
                    ? 'text-sm text-foreground'
                    : 'text-sm text-destructive'
                }
              >
                {message.text}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {labels.testCancel}
            </Button>
            <Button onClick={submit} disabled={pending}>
              {labels.testSend}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PushTokensTable({
  rows,
  nextCursor,
  filterTenantId,
  onSendTest,
  labels,
}: PushTokensTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          method="GET"
          action="/super-admin/mobile"
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mobile-filter-tenant">{labels.filterTenant}</Label>
            <Input
              id="mobile-filter-tenant"
              name="tenantId"
              defaultValue={filterTenantId}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">{labels.apply}</Button>
            <Link
              href="/super-admin/mobile"
              className={buttonVariants({ variant: 'ghost' })}
            >
              {labels.reset}
            </Link>
          </div>
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.tenantColumn}</TableHead>
                <TableHead>{labels.userColumn}</TableHead>
                <TableHead>{labels.platformColumn}</TableHead>
                <TableHead>{labels.deviceColumn}</TableHead>
                <TableHead>{labels.tokenColumn}</TableHead>
                <TableHead>{labels.createdAtColumn}</TableHead>
                <TableHead>{labels.lastUsedColumn}</TableHead>
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
                  <TableCell className="text-xs text-muted-foreground">{row.userEmail}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {row.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.deviceName ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.tokenPreview}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatTimestamp(row.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatTimestamp(row.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <SendTestDialog row={row} onSendTest={onSendTest} labels={labels} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {nextCursor ? (
          <div className="flex justify-center">
            <Link
              href={buildHref(filterTenantId, nextCursor)}
              className={buttonVariants({ variant: 'outline' })}
            >
              {labels.loadMore}
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
