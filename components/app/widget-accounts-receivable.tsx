import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format-money';
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { registerBalance } from '@/platform/engine';
import { Link } from '@/platform/i18n/navigation';
import { type Locale, getRegistry } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

export async function AccountsReceivableWidget({
  ctx,
  customerId,
  locale,
}: {
  ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> };
  customerId: string;
  locale: Locale;
}): Promise<React.ReactElement | null> {
  const tCatalog = await getTranslations('catalog');
  const tCommon = await getTranslations('common');
  const currency = ctx.tenant.currency;

  const reg = getRegistry().register['sales.accounts_receivable'];
  if (!reg) return null;

  const { quantity: balance } = await withTenant(ctx.tenant.id, (tx) =>
    registerBalance(tx, reg, { customer: customerId }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCatalog('widgetAccountsReceivable')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-3xl font-semibold tabular-nums text-foreground">
              {formatMoney(balance, locale, currency)}
            </div>
            <p className="text-sm text-muted-foreground">{tCatalog('outstandingAsOfLabel')}</p>
          </div>
          <Link
            href={`/registers/sales.accounts_receivable?customer=${customerId}`}
            className="text-sm text-primary hover:underline"
          >
            {tCatalog('widgetAccountsReceivable')}
          </Link>
        </div>
        <Link
          href={`/documents/sales.payment_received/new?customer=${customerId}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {tCommon('recordPayment')}
        </Link>
      </CardContent>
    </Card>
  );
}
