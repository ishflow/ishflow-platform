import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { Link } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';

type InvoiceRow = {
  id: string;
  number: string | null;
  status: string;
  date: Date;
};

export async function RecentInvoicesWidget({
  ctx,
  customerId,
  locale,
}: {
  ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> };
  customerId: string;
  locale: Locale;
}) {
  const t = await getTranslations('catalog');
  const tCommon = await getTranslations('common');
  const tDoc = await getTranslations('document');

  const rows = await withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      document_sales_invoice: {
        findMany: (args: unknown) => Promise<InvoiceRow[]>;
      };
    };
    return bag.document_sales_invoice.findMany({
      where: { customer: customerId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, number: true, status: true, date: true },
    });
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('widgetRecentInvoices')}</CardTitle>
        <Link
          href={`/documents/sales.invoice/new?customer=${customerId}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {tCommon('newInvoice')}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/documents/sales.invoice/${r.id}`}
              className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
            >
              <span className="font-medium">{r.number ?? r.id.slice(0, 8)}</span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{new Date(r.date).toLocaleDateString(locale)}</span>
                <Badge variant={r.status === 'POSTED' ? 'default' : 'outline'}>
                  {tDoc(`statusLabel.${r.status}`)}
                </Badge>
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
