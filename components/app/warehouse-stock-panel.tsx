'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

type StockItem = {
  productId: string;
  productLabel: string;
  quantity: number;
};

type Payload = { items: StockItem[]; total: number };

type PanelStatus =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ok'; data: Payload };

const DEBOUNCE_MS = 200;

export function WarehouseStockPanel({ watchFieldName }: { watchFieldName: string }) {
  const t = useTranslations('document.warehouseStock');
  const { watch } = useFormContext();
  const warehouseId = watch(watchFieldName) as string | null | undefined;
  const [status, setStatus] = useState<PanelStatus>({ kind: 'empty' });

  useEffect(() => {
    if (!warehouseId) {
      setStatus({ kind: 'empty' });
      return;
    }
    setStatus({ kind: 'loading' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/warehouse-stock?warehouse=${encodeURIComponent(warehouseId)}`, {
        signal: ctrl.signal,
        cache: 'no-store',
      })
        .then((r) => (r.ok ? (r.json() as Promise<Payload>) : Promise.reject(new Error('bad'))))
        .then((data) => setStatus({ kind: 'ok', data }))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setStatus({ kind: 'error' });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [warehouseId]);

  return (
    <Card size="sm" className="text-xs lg:sticky lg:top-[9rem] lg:h-[calc(100dvh-10rem)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xs">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {status.kind === 'empty' && <StatusRow>{t('empty')}</StatusRow>}
        {status.kind === 'loading' && <StatusRow>{t('loading')}</StatusRow>}
        {status.kind === 'error' && <StatusRow>{t('errorFallback')}</StatusRow>}
        {status.kind === 'ok' && status.data.items.length === 0 && (
          <StatusRow>{t('noStock')}</StatusRow>
        )}
        {status.kind === 'ok' && status.data.items.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-muted [&_td]:px-2 [&_td]:py-1 [&_th]:h-7 [&_th]:px-2">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnProduct')}</TableHead>
                  <TableHead className="w-16 text-right">{t('columnQuantity')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.data.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell
                      className="max-w-0 truncate whitespace-normal"
                      title={item.productLabel}
                    >
                      {item.productLabel}
                    </TableCell>
                    <TableCell className="w-16 text-right tabular-nums">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusRow({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-4 text-center text-xs text-muted-foreground">{children}</div>;
}
