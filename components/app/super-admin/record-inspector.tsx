'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';

export interface RecordInspectorAudit {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: Date | string;
  userEmail: string | null;
}

interface ActivityDict {
  columns: {
    when: string;
    actor: string;
    entity: string;
    action: string;
    inspect: string;
  };
  empty: string;
  inspector: {
    title: string;
    descriptionEmpty: string;
    entityLabel: string;
    beforeLabel: string;
    afterLabel: string;
  };
  common: {
    close: string;
    dash: string;
  };
}

function stringify(value: unknown, dash: string): string {
  if (value === null || value === undefined) return dash;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function RecordInspector({
  audit,
  onClose,
  dict,
}: {
  audit: RecordInspectorAudit | null;
  onClose: () => void;
  dict: ActivityDict;
}) {
  const open = audit !== null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{dict.inspector.title}</SheetTitle>
          <SheetDescription>
            {audit
              ? `${audit.entity} · ${audit.action} · ${audit.userEmail ?? 'system'}`
              : dict.inspector.descriptionEmpty}
          </SheetDescription>
        </SheetHeader>
        {audit ? (
          <div className="flex flex-col gap-4 px-4 pb-6">
            <section className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {dict.inspector.entityLabel}
              </div>
              <div className="font-mono text-xs break-all text-foreground">
                {audit.entity} / {audit.entityId}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(audit.createdAt).toISOString()}
              </div>
            </section>
            <Separator />
            <section className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {dict.inspector.beforeLabel}
              </div>
              <pre className="rounded-md border bg-muted p-3 text-xs overflow-x-auto">
                {stringify(audit.before, dict.common.dash)}
              </pre>
            </section>
            <Separator />
            <section className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {dict.inspector.afterLabel}
              </div>
              <pre className="rounded-md border bg-muted p-3 text-xs overflow-x-auto">
                {stringify(audit.after, dict.common.dash)}
              </pre>
            </section>
            <div className="flex justify-end">
              <SheetClose render={<Button variant="outline">{dict.common.close}</Button>} />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export interface ActivityTableRow {
  id: string;
  userId: string | null;
  userEmail: string | null;
  entity: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19);
}

export function ActivityTable({
  rows,
  dict,
}: {
  rows: ReadonlyArray<ActivityTableRow>;
  dict: ActivityDict;
}) {
  const [selected, setSelected] = useState<RecordInspectorAudit | null>(null);

  if (rows.length === 0) {
    return (
      <Card className="py-12">
        <p className="text-center text-sm text-muted-foreground">{dict.empty}</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.columns.when}</TableHead>
              <TableHead>{dict.columns.actor}</TableHead>
              <TableHead>{dict.columns.entity}</TableHead>
              <TableHead>{dict.columns.action}</TableHead>
              <TableHead className="text-right">{dict.columns.inspect}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(row.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.userEmail ??
                    (row.userId ? (
                      <span className="font-mono">{row.userId}</span>
                    ) : (
                      dict.common.dash
                    ))}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.entity}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {row.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelected({
                        id: row.id,
                        entity: row.entity,
                        entityId: row.entityId,
                        action: row.action,
                        before: row.before,
                        after: row.after,
                        createdAt: row.createdAt,
                        userEmail: row.userEmail,
                      })
                    }
                  >
                    {dict.columns.inspect}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <RecordInspector audit={selected} onClose={() => setSelected(null)} dict={dict} />
    </>
  );
}
