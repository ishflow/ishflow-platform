'use client';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from '@/platform/i18n/navigation';
import { Plus } from 'lucide-react';

function fmt(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toFixed(2);
}

export type PricingMatrixRow = {
  productId: string;
  productName: string;
  liveCost: number;
  pricesByType: Record<string, number | null>;
};

export type PriceTypeColumn = {
  id: string;
  name: string;
  kind: string;
  markupPct: number | null;
  isDefault: boolean;
};

type Strings = {
  title: string;
  product: string;
  liveCost: string;
  empty: string;
  editPrices: string;
};

export function PricingMatrixClient({
  rows,
  priceTypes,
  t,
}: {
  rows: PricingMatrixRow[];
  priceTypes: PriceTypeColumn[];
  t: Strings;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.product}</TableHead>
              <TableHead className="text-right">{t.liveCost}</TableHead>
              {priceTypes.map((p) => (
                <TableHead key={p.id} className="text-right">
                  {p.name}
                  {p.kind === 'dynamic' && p.markupPct !== null
                    ? ` (+${(p.markupPct * 100).toFixed(2).replace(/\.?0+$/, '')}%)`
                    : ''}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2 + priceTypes.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t.empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.liveCost)}</TableCell>
                  {priceTypes.map((p) => {
                    const v = row.pricesByType[p.id];
                    return (
                      <TableCell key={p.id} className="text-right tabular-nums">
                        {v === null || v === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          fmt(v)
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="justify-start gap-2">
        <Link
          href="/documents/inventory.price_setting/new"
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus className="mr-1 size-4" />
          {t.editPrices}
        </Link>
      </CardFooter>
    </Card>
  );
}
