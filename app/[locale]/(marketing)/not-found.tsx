import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function MarketingNotFound() {
  const t = await getTranslations('marketing.notFound');
  return (
    <main className="mx-auto max-w-3xl px-4 py-32 text-center sm:px-6 lg:px-8">
      <div className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-marketing-fg-3 before:size-1.5 before:rounded-full before:bg-primary before:content-['']">
        404
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {t('headline')}
      </h1>
      <p className="mt-4 text-marketing-fg-2 sm:text-lg">{t('body')}</p>
      <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
        {t('cta')} <ArrowRight className="ml-2 size-4" />
      </Link>
    </main>
  );
}
