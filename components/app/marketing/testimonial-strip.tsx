import type { TestimonialsContent } from '@/platform/marketing/types';
import { FadeIn } from './fade-in';
import { MarketingIcon } from './icons/marketing-icons';

interface Props {
  content: TestimonialsContent;
  eyebrow?: string;
  headline?: string;
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TestimonialStrip({ content, eyebrow, headline }: Props) {
  const items = content?.items ?? [];
  if (!items.length) return null;
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || headline) && (
          <div className="mx-auto mb-14 max-w-3xl sm:mb-20">
            {eyebrow && (
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-marketing-fg-3 before:size-1.5 before:rounded-full before:bg-primary before:content-['']">
                {eyebrow}
              </div>
            )}
            {headline && (
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((t, i) => {
            const initials = initialsFromName(t.authorName);
            const subtitle = t.authorCompany
              ? `${t.authorRole} · ${t.authorCompany}`
              : t.authorRole;
            return (
              <li key={`${t.authorName}-${i}`}>
                <FadeIn
                  delay={i * 0.04}
                  className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6"
                >
                  <MarketingIcon name="receipt" size={22} className="text-marketing-fg-3" />
                  <blockquote className="leading-relaxed text-marketing-fg-2">
                    «{t.quote}»
                  </blockquote>
                  <div className="mt-auto flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                      {initials}
                    </span>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{t.authorName}</div>
                      <div className="text-marketing-fg-3">{subtitle}</div>
                    </div>
                  </div>
                </FadeIn>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
