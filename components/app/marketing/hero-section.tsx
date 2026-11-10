import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import type { HeroContent } from '@/platform/marketing/types';
import { ArrowRight } from 'lucide-react';
import { StaticHeroBg } from './3d/static-hero-bg';
import { FadeIn } from './fade-in';
import { ProductScreenMock } from './product-screen-mock';

interface HeroSectionProps {
  content: HeroContent;
  trustItems?: string[];
}

export function HeroSection({ content, trustItems }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      <StaticHeroBg />
      <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40 lg:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="text-center lg:text-left">
            {content.eyebrow && (
              <FadeIn>
                <Badge
                  variant="secondary"
                  className="mb-6 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-marketing-fg-2 backdrop-blur"
                >
                  {content.eyebrow}
                </Badge>
              </FadeIn>
            )}
            <FadeIn delay={0.05}>
              <h1 className="font-display text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {content.headline}
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mx-auto lg:mx-0 mt-6 max-w-2xl text-balance text-base text-marketing-fg-2 sm:text-lg">
                {content.subhead}
              </p>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="mt-10 flex flex-col items-center lg:items-start justify-center lg:justify-start gap-3 sm:flex-row">
                <Link
                  href={content.primaryCta.href}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'group min-w-[180px] shadow-elev-md',
                  )}
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
            </FadeIn>
            {trustItems && trustItems.length > 0 && (
              <FadeIn delay={0.2}>
                <ul className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-2 text-xs uppercase tracking-[0.08em] text-marketing-fg-3">
                  {trustItems.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </FadeIn>
            )}
          </div>
          <FadeIn delay={0.2}>
            <div className="hidden lg:block">
              <ProductScreenMock />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
