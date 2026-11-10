import type { SocialProofContent } from '@/platform/marketing/types';
import { FadeIn } from '../fade-in';

interface SocialProofStripProps {
  content: SocialProofContent;
}

export function SocialProofStrip({ content }: SocialProofStripProps) {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {content.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <dt className="text-3xl font-semibold tracking-tight sm:text-4xl">{stat.value}</dt>
                <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </FadeIn>
      </div>
    </section>
  );
}
