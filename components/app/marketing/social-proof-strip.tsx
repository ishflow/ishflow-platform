import type { SocialProofContent } from '@/platform/marketing/types';
import { Marquee } from './effects/marquee';

export function SocialProofStrip({ content }: { content: SocialProofContent }) {
  if (!content?.logos?.length) return null;
  return (
    <section aria-label={undefined} className="py-10">
      <Marquee durationSeconds={40} className="opacity-60 hover:opacity-100 transition-opacity">
        {content.logos.map((l, i) => (
          <span
            key={`${l.name ?? i}-${i}`}
            className="font-display text-lg text-marketing-fg-2 whitespace-nowrap"
          >
            {l.name ?? ''}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
