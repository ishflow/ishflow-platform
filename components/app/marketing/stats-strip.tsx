import { cn } from '@/lib/utils';
import type { StatsStripContent } from '@/platform/marketing/types';
import { NumberTicker } from './effects/number-ticker';
import { FadeIn } from './fade-in';

function parseStat(raw: string): { numeric: number | null; rest: string } {
  const match = raw.match(/^([0-9]+(?:[\.,][0-9]+)?)([\s\S]*)$/);
  if (!match || match[1] === undefined) return { numeric: null, rest: raw };
  const num = Number(match[1].replace(',', '.'));
  if (Number.isNaN(num)) return { numeric: null, rest: raw };
  return { numeric: num, rest: match[2] ?? '' };
}

export function StatsStrip({ content }: { content: StatsStripContent }) {
  return (
    <section className="border-y border-border bg-marketing-bg-2/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <ul className="grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-4">
          {content.items.map((s, i) => {
            const { numeric, rest } = parseStat(s.value);
            return (
              <li key={`${s.label}-${i}`} className="text-center">
                <FadeIn delay={i * 0.04}>
                  <div
                    className={cn(
                      'font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl',
                    )}
                  >
                    {numeric !== null ? (
                      <>
                        <NumberTicker value={numeric} />
                        {rest}
                      </>
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.08em] text-marketing-fg-3">
                    {s.label}
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
