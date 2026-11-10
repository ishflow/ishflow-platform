import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import type { HeroContent } from '@/platform/marketing/types';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from '../fade-in';

interface HeroSectionProps {
  content: HeroContent;
}

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32 lg:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          {content.eyebrow && (
            <FadeIn>
              <Badge
                variant="secondary"
                className="mb-6 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
              >
                {content.eyebrow}
              </Badge>
            </FadeIn>
          )}
          <FadeIn delay={0.05}>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {content.headline}
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              {content.subhead}
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
          </FadeIn>
        </div>

        <FadeIn delay={0.25}>
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-primary/5">
              <div className="aspect-[16/9] w-full bg-gradient-to-br from-muted/40 via-background to-muted/20">
                <DashboardMock />
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      <div className="absolute -top-32 left-1/2 size-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute top-32 left-1/4 size-[400px] rounded-full bg-secondary/30 blur-[100px]" />
      <div
        className="absolute inset-x-0 top-0 h-96 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="grid h-full grid-cols-[200px_1fr] divide-x divide-border/40 text-xs">
      <div className="flex flex-col gap-2 bg-muted/20 p-4">
        <div className="mb-3 h-2 w-20 rounded bg-foreground/20" />
        {[
          'Dashboard',
          'Sales',
          'Purchases',
          'Inventory',
          'Pricing',
          'Reports',
          'Audit',
          'Settings',
        ].map((s) => (
          <div key={s} className="flex h-7 items-center rounded-md px-2 text-muted-foreground/80">
            <span className="mr-2 size-2 rounded-sm bg-foreground/10" />
            {s}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 rounded bg-foreground/20" />
          <div className="h-7 w-24 rounded-md bg-primary/30" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['A/R', '₽4.2M', 'text-emerald-500'],
            ['Stock', '124', 'text-blue-500'],
            ['MTD', '₽1.8M', 'text-violet-500'],
            ['Open', '8', 'text-amber-500'],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-lg border border-border/40 bg-background/60 p-3">
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className={cn('mt-1 text-base font-semibold', color)}>{val}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-lg border border-border/40 bg-background/60 p-3">
          <div className="mb-2 h-2 w-24 rounded bg-foreground/15" />
          <div className="flex h-32 items-end gap-1">
            {[40, 55, 35, 70, 45, 80, 60, 90, 50, 75, 65, 85].map((h, i) => (
              <div
                key={`bar-${i}-${h}`}
                className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
