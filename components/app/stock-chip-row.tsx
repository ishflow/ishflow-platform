'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type BreakdownRow = { warehouseId: string; warehouseLabel: string; quantity: number };

/**
 * Sprint 30: per-warehouse stock chips displayed under a sales line after
 * a product is picked. Powered by GET /api/stock-balance?product=<id>.
 * Renders nothing until the fetch resolves, and nothing if the product is empty.
 */
export function StockChipRow({ productId }: { productId: string | null | undefined }) {
  const t = useTranslations('document.lines.stockBreakdown');
  const [rows, setRows] = useState<BreakdownRow[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!productId) {
      setRows(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/stock-balance?product=${encodeURIComponent(productId)}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { breakdown: BreakdownRow[]; total: number } | null) => {
        if (!data) return;
        setRows(data.breakdown.filter((b) => b.quantity > 0));
        setTotal(data.total);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [productId]);

  if (!productId || rows === null) return null;
  const visible = rows.slice(0, 3);
  const hidden = rows.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
      {visible.map((r) => (
        <Badge key={r.warehouseId} variant="secondary" className="font-normal">
          {r.warehouseLabel}: {r.quantity}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge variant="outline" className="font-normal">
          +{hidden} {t('more')}
        </Badge>
      )}
      <span className="text-muted-foreground">·</span>
      <span className="font-medium text-foreground">
        {t('total')}: {total}
      </span>
    </div>
  );
}
