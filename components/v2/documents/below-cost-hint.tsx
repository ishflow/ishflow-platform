'use client';

import { resolveLineCost } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-line-cost';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/**
 * Client-side hint that warns the user when a line's price drops below the
 * product's average cost. The server `belowCost` validator blocks posting
 * regardless; this hint surfaces the gap earlier so the user notices
 * before clicking Save and Post.
 *
 * Cost lookup uses `resolveLineCost`, which returns the cross-warehouse
 * average cost. The server's per-warehouse cost can differ slightly, so
 * the hint is informational, not authoritative.
 */
export function BelowCostHint({
  productId,
  warehouseId: _warehouseId,
  price,
}: {
  productId: string | null | undefined;
  warehouseId: string | null | undefined;
  price: string | null | undefined;
}) {
  const t = useTranslations('v2_documents.new.lines');
  const locale = useLocale();
  const [cost, setCost] = useState<number>(0);
  const lastFetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setCost(0);
      lastFetchedFor.current = null;
      return;
    }
    if (lastFetchedFor.current === productId) return; // cache by product
    let cancelled = false;
    lastFetchedFor.current = productId;
    (async () => {
      try {
        const res = await resolveLineCost({ productId });
        if (cancelled) return;
        setCost(res && typeof res.cost === 'number' ? res.cost : 0);
      } catch {
        if (!cancelled) setCost(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) return null;
  if (cost <= 0) return null;
  const p = Number(price);
  if (!Number.isFinite(p) || p === 0) return null;
  if (p >= cost) return null;

  const amount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
  }).format(cost);

  return (
    <Badge variant="destructive" className="gap-1 font-normal" data-testid="below-cost-badge">
      <AlertTriangle size={12} strokeWidth={1.75} />
      {t('belowCost', { amount })}
    </Badge>
  );
}
