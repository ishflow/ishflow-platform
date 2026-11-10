import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { registerBalance } from '@/platform/engine';
import { Link } from '@/platform/i18n/navigation';
import { type Locale, getRegistry } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function CurrentStockWidget({
  ctx,
  productId,
  locale: _locale,
}: {
  ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> };
  productId: string;
  locale: Locale;
}) {
  const register = getRegistry().register['inventory.stock_balance'];
  if (!register) return null;

  const t = await getTranslations('catalog');
  const tReg = await getTranslations('register');

  const balance = await withTenant(ctx.tenant.id, (tx) =>
    registerBalance(tx, register, { product: productId }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('widgetCurrentStock')}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-baseline justify-between">
        <div className="text-3xl font-semibold tabular-nums">{balance.quantity}</div>
        <Link
          href={`/registers/${register.id}?product=${productId}`}
          className="text-sm text-primary hover:underline"
        >
          {tReg('viewMovements')}
        </Link>
      </CardContent>
    </Card>
  );
}
