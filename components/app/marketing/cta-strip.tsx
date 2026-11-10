import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import type { CtaStripContent } from '@/platform/marketing/types';
import { ArrowRight } from 'lucide-react';
import { BorderBeam } from './effects/border-beam';
import { FadeIn } from './fade-in';

export function CtaStrip({ content }: { content: CtaStripContent }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground px-8 py-14 sm:px-14 sm:py-16 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end shadow-elev-lg">
            <BorderBeam size={300} duration={16} />
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {content.headline}
              </h2>
              {content.body && (
                <p className="mt-4 max-w-xl text-primary-foreground/85">{content.body}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={content.primaryCta.href}
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'min-w-[180px]',
                )}
              >
                {content.primaryCta.label}
                <ArrowRight className="ml-2 size-4" />
              </Link>
              {content.secondaryCta && (
                <Link
                  href={content.secondaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {content.secondaryCta.label}
                </Link>
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
