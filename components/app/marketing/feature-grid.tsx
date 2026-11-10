import { Link } from '@/platform/i18n/navigation';
import type { FeatureGridContent } from '@/platform/marketing/types';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from './fade-in';
import { MarketingIcon, type MarketingIconName } from './icons/marketing-icons';

interface Props {
  content: FeatureGridContent;
  eyebrow: string;
  headline: string;
  body?: string;
}

export function FeatureGrid({ content, eyebrow, headline, body }: Props) {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl mb-14 sm:mb-20">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-marketing-fg-3 inline-flex items-center gap-2 before:size-1.5 before:rounded-full before:bg-primary before:content-['']">
            {eyebrow}
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {headline}
          </h2>
          {body && <p className="mt-4 text-marketing-fg-2 sm:text-lg">{body}</p>}
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.cards.map((c, i) => (
            <li key={c.id ?? c.title} className="h-full">
              <FadeIn delay={i * 0.03} className="h-full">
                <Link
                  href={c.href ?? '#'}
                  className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-marketing-bg-2"
                >
                  <span className="grid size-10 place-items-center rounded-lg border border-border bg-background text-foreground">
                    <MarketingIcon
                      name={(c.icon as MarketingIconName | undefined) ?? 'doc'}
                      size={20}
                    />
                  </span>
                  <h3 className="font-display text-lg font-medium text-foreground">{c.title}</h3>
                  <p className="text-sm text-marketing-fg-2 flex-1">{c.body}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Подробнее <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
