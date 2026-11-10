import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import type { CtaStripContent } from '@/platform/marketing/types';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from '../fade-in';

interface CtaStripProps {
  content: CtaStripContent;
}

export function CtaStrip({ content }: CtaStripProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-secondary/20 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="absolute -top-32 left-1/2 -z-0 h-96 w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
            />
            <div className="relative">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {content.headline}
              </h2>
              {content.body && (
                <p className="mx-auto mt-4 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
                  {content.body}
                </p>
              )}
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={content.primaryCta.href}
                  className={cn(buttonVariants({ size: 'lg' }), 'group min-w-[180px]')}
                >
                  {content.primaryCta.label}
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {content.secondaryCta && (
                  <Link
                    href={content.secondaryCta.href}
                    className={cn(
                      buttonVariants({ size: 'lg', variant: 'outline' }),
                      'min-w-[180px]',
                    )}
                  >
                    {content.secondaryCta.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
