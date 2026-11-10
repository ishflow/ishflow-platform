'use client';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import type { PlatformSettingRow } from '@/platform/super-admin/system/platform-settings';

interface PlatformSettingsTableProps {
  rows: ReadonlyArray<PlatformSettingRow>;
  onSubmit: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
  labels: {
    rowsTitle: string;
    rowsDescription: string;
    keyColumn: string;
    valueColumn: string;
    updatedAtColumn: string;
    updatedByColumn: string;
    save: string;
    delete: string;
    empty: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: string;
    confirmDeleteYes: string;
    confirmDeleteCancel: string;
    errorInvalidJson: string;
  };
}

function formatTimestamp(d: Date): string {
  return new Date(d).toISOString().replace('T', ' ').replace(/\..+/, 'Z');
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function SettingRow({
  row,
  onSubmit,
  onDelete,
  labels,
}: {
  row: PlatformSettingRow;
  onSubmit: PlatformSettingsTableProps['onSubmit'];
  onDelete: PlatformSettingsTableProps['onDelete'];
  labels: PlatformSettingsTableProps['labels'];
}) {
  const [draft, setDraft] = useState(() => pretty(row.value));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function save() {
    // client-side json validation for UX
    try {
      JSON.parse(draft);
    } catch (e) {
      setError(labels.errorInvalidJson.replace('{reason}', (e as Error).message));
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set('key', row.key);
    fd.set('value', draft);
    startTransition(async () => {
      try {
        await onSubmit(fd);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set('key', row.key);
    setConfirmOpen(false);
    startTransition(async () => {
      try {
        await onDelete(fd);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs text-foreground">{row.key}</TableCell>
      <TableCell className="align-top">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(8, Math.max(2, draft.split('\n').length))}
          className="font-mono text-xs"
        />
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
      <TableCell className="align-top whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
        {formatTimestamp(row.updatedAt)}
      </TableCell>
      <TableCell className="align-top whitespace-nowrap font-mono text-xs text-muted-foreground">
        {row.updatedBy ?? '—'}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {labels.save}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
          >
            {labels.delete}
          </Button>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.confirmDeleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.confirmDeleteBody.replace('{key}', row.key)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{labels.confirmDeleteCancel}</AlertDialogCancel>
              <AlertDialogAction onClick={remove}>{labels.confirmDeleteYes}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function PlatformSettingsTable({
  rows,
  onSubmit,
  onDelete,
  labels,
}: PlatformSettingsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.rowsTitle}</CardTitle>
        <CardDescription>{labels.rowsDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20%]">{labels.keyColumn}</TableHead>
                <TableHead>{labels.valueColumn}</TableHead>
                <TableHead className="w-[14%]">{labels.updatedAtColumn}</TableHead>
                <TableHead className="w-[14%]">{labels.updatedByColumn}</TableHead>
                <TableHead className="w-[10%] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <SettingRow
                  key={row.key}
                  row={row}
                  onSubmit={onSubmit}
                  onDelete={onDelete}
                  labels={labels}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
