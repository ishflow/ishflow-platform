import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { requireContext } from '@/platform/auth/current-context';
import { FilePlus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function QuickNewSalesInvoiceWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  return (
    <Link
      href={`/${locale}/documents/sales.invoice/new`}
      className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start gap-2')}
    >
      <FilePlus className="h-4 w-4" />
      {t('quick.newSalesInvoice')}
    </Link>
  );
}
