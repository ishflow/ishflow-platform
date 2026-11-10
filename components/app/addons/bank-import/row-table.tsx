'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormatter, useTranslations } from 'next-intl';
import { useTransition } from 'react';

export type BankRowView = {
  id: string;
  valueDate: string;
  direction: 'in' | 'out';
  amount: number;
  currency: string;
  counterpartyName: string | null;
  narrative: string | null;
  status: 'pending' | 'matched' | 'confirmed' | 'ignored' | 'conflict';
  matchConfidence: number | null;
  matchedDocId: string | null;
  matchedDocLabel: string | null;
  paymentDocId: string | null;
};

interface RowTableProps {
  rows: BankRowView[];
  confirmAction: (formData: FormData) => void | Promise<void>;
  ignoreAction: (formData: FormData) => void | Promise<void>;
}

const STATUS_VARIANT: Record<
  BankRowView['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending: 'outline',
  matched: 'secondary',
  confirmed: 'default',
  ignored: 'outline',
  conflict: 'destructive',
};

export function RowTable({ rows, confirmAction, ignoreAction }: RowTableProps) {
  const t = useTranslations('addons.bankImport');
  const fmt = useFormatter();
  const [pending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('runs.table.date')}</TableHead>
          <TableHead>{t('runs.table.direction')}</TableHead>
          <TableHead className="text-right">{t('runs.table.amount')}</TableHead>
          <TableHead>{t('runs.table.counterparty')}</TableHead>
          <TableHead>{t('runs.table.narrative')}</TableHead>
          <TableHead>{t('runs.table.status')}</TableHead>
          <TableHead>{t('runs.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap">
              {fmt.dateTime(new Date(row.valueDate), { dateStyle: 'medium' })}
            </TableCell>
            <TableCell>
              <Badge variant={row.direction === 'in' ? 'secondary' : 'outline'}>
                {t(`runs.direction.${row.direction}`)}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              {fmt.number(row.amount, {
                style: 'currency',
                currency: row.currency,
                currencyDisplay: 'narrowSymbol',
              })}
            </TableCell>
            <TableCell className="max-w-[14rem] truncate">{row.counterpartyName ?? '—'}</TableCell>
            <TableCell className="max-w-[18rem] truncate text-xs text-muted-foreground">
              {row.narrative ?? '—'}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <Badge variant={STATUS_VARIANT[row.status]}>{t(`runs.status.${row.status}`)}</Badge>
                {row.matchedDocLabel && (
                  <span className="text-xs text-muted-foreground">
                    {row.matchedDocLabel}
                    {row.matchConfidence !== null
                      ? ` · ${(row.matchConfidence * 100).toFixed(0)}%`
                      : ''}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {row.status === 'matched' && (
                  <form
                    action={(fd) => {
                      fd.set('rowId', row.id);
                      startTransition(() => {
                        void confirmAction(fd);
                      });
                    }}
                  >
                    <Button type="submit" size="sm" disabled={pending}>
                      {t('actions.confirm')}
                    </Button>
                  </form>
                )}
                {(row.status === 'pending' ||
                  row.status === 'conflict' ||
                  row.status === 'matched') && (
                  <form
                    action={(fd) => {
                      fd.set('rowId', row.id);
                      startTransition(() => {
                        void ignoreAction(fd);
                      });
                    }}
                  >
                    <Button type="submit" size="sm" variant="ghost" disabled={pending}>
                      {t('actions.ignore')}
                    </Button>
                  </form>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
