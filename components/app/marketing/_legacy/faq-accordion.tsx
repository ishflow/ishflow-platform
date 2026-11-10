'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FaqContent } from '@/platform/marketing/types';

interface FaqAccordionProps {
  content: FaqContent;
  headline?: string;
  body?: string;
}

export function FaqAccordion({ content, headline, body }: FaqAccordionProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {(headline || body) && (
          <div className="mb-10 text-center">
            {headline && (
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {headline}
              </h2>
            )}
            {body && <p className="mt-4 text-balance text-muted-foreground sm:text-lg">{body}</p>}
          </div>
        )}

        <Accordion className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/60 px-2 sm:px-4">
          {content.items.map((item, idx) => (
            <AccordionItem key={`${item.q}-${idx}`} value={`item-${idx}`}>
              <AccordionTrigger className="px-2 py-4 text-left text-base sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-4 text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
