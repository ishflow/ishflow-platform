import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/platform/i18n/navigation';
import type { DemoSectionContent } from '@/platform/marketing/types';
import { Check, PlayCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FadeIn } from './fade-in';

interface DemoSectionProps {
  content: DemoSectionContent;
  locale: string;
}

export async function DemoSection({ content, locale }: DemoSectionProps) {
  const t = await getTranslations({ locale, namespace: 'marketing.demo' });

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <div>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {content.headline}
              </h2>
              <p className="mt-4 text-balance text-muted-foreground sm:text-lg">{content.body}</p>
              {content.bullets && content.bullets.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {content.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3" />
                      </span>
                      <span className="text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>
                  {t('startFree')}
                </Link>
                <Link
                  href="/contact"
                  className={buttonVariants({ size: 'lg', variant: 'outline' })}
                >
                  <PlayCircle className="mr-2 size-4" />
                  {t('bookDemo')}
                </Link>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20 blur-2xl" />
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
                <div className="border-b border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                  demo.ishflow.com / reports
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      { label: 'Sales MTD', value: '₽1,847,200', delta: '+18%' },
                      { label: 'A/R', value: '₽4,212,800', delta: '−4%' },
                      { label: 'Stock value', value: '₽12,604,100', delta: '+2%' },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className="rounded-lg border border-border/60 bg-background/50 p-3"
                      >
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className="mt-1 text-base font-semibold">{c.value}</div>
                        <div className="mt-0.5 text-[10px] text-emerald-500">{c.delta}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/50 p-4">
                    <div className="mb-3 flex items-center justify-between text-xs">
                      <span className="font-medium">Turnover (last 12 months)</span>
                      <span className="text-muted-foreground">RUB</span>
                    </div>
                    <div className="flex h-32 items-end gap-1.5">
                      {[35, 45, 52, 38, 60, 72, 65, 78, 82, 70, 88, 92].map((h, i) => (
                        <div
                          key={`bar-${i}-${h}`}
                          className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary/90"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
