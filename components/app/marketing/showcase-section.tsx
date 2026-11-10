import type { ShowcaseContent } from '@/platform/marketing/types';
import { FadeIn } from './fade-in';
import { ShowcasePanelStack } from './showcase-panel-stack';

export function ShowcaseSection({ content }: { content: ShowcaseContent }) {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <FadeIn>
              <div className="text-xs font-medium uppercase tracking-[0.08em] text-marketing-fg-3 inline-flex items-center gap-2 before:size-1.5 before:rounded-full before:bg-primary before:content-['']">
                {content.eyebrow}
              </div>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {content.headline}
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-4 text-marketing-fg-2 sm:text-lg max-w-md">{content.body}</p>
            </FadeIn>
          </div>
          <FadeIn delay={0.15}>
            <ShowcasePanelStack labels={content.labels} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
