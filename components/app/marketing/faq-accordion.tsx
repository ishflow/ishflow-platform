import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FaqContent } from '@/platform/marketing/types';
import { FadeIn } from './fade-in';

interface Props {
  content: FaqContent;
  headline?: string;
  body?: string;
}

export function FaqAccordion({ content, headline, body }: Props) {
  if (!content?.items?.length) return null;
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {headline && (
          <FadeIn>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl mb-4">
              {headline}
            </h2>
          </FadeIn>
        )}
        {body && (
          <FadeIn delay={0.05}>
            <p className="text-marketing-fg-2 mb-10">{body}</p>
          </FadeIn>
        )}
        <Accordion className="space-y-2">
          {content.items.map((item, i) => (
            <AccordionItem
              key={`${item.q}-${i}`}
              value={`faq-${i}`}
              className="rounded-xl border border-border bg-card data-open:bg-marketing-bg-2 px-5"
            >
              <AccordionTrigger className="text-left font-display text-base font-medium hover:no-underline py-5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-marketing-fg-2 pb-5 leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
