import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format-money';
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { registerBalanceAll } from '@/platform/engine';
import { type Locale, getRegistry } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function CurrentCostWidget({
  ctx,
  productId,
  locale,
}: {
  ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> };
  productId: string;
  locale: Locale;
}) {
  const register = getRegistry().register['inventory.stock_balance'];
  if (!register) return null;

  const t = await getTranslations('catalog');
  const currency = (ctx.tenant as { currency?: string }).currency ?? 'USD';

  const bal = await withTenant(ctx.tenant.id, (tx) =>
    registerBalanceAll(tx, register, { product: productId }),
  );
  const qty = Number(bal.quantity ?? 0);
  const total = Number(bal.totalCost ?? 0);
  const avg = qty > 0 ? total / qty : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('widgetCurrentCost')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">
          {formatMoney(avg, locale, currency)}
        </div>
      </CardContent>
    </Card>
  );
}
