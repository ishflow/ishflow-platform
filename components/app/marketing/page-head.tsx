import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { FadeIn } from './fade-in';

interface Props {
  eyebrow?: string;
  headline: ReactNode;
  lede?: ReactNode;
  align?: 'center' | 'start';
  className?: string;
}

export function PageHead({ eyebrow, headline, lede, align = 'center', className }: Props) {
  return (
    <section className={cn('relative pt-20 pb-12 sm:pt-28 sm:pb-16', className)}>
      <div
        className={cn(
          'mx-auto max-w-4xl px-4 sm:px-6 lg:px-8',
          align === 'center' && 'text-center',
        )}
      >
        {eyebrow && (
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-marketing-fg-3 before:size-1.5 before:rounded-full before:bg-primary before:content-['']">
              {eyebrow}
            </div>
          </FadeIn>
        )}
        <FadeIn delay={0.05}>
          <h1 className="mt-5 font-display text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {headline}
          </h1>
        </FadeIn>
        {lede && (
          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-marketing-fg-2 sm:text-lg">
              {lede}
            </p>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
