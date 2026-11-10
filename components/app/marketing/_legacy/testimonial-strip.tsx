import { Card, CardContent } from '@/components/ui/card';
import type { TestimonialsContent } from '@/platform/marketing/types';
import { Quote } from 'lucide-react';
import { FadeIn } from '../fade-in';

interface TestimonialStripProps {
  content: TestimonialsContent;
  eyebrow?: string;
  headline?: string;
}

export function TestimonialStrip({ content, eyebrow, headline }: TestimonialStripProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || headline) && (
          <div className="mx-auto mb-14 max-w-2xl text-center">
            {eyebrow && (
              <FadeIn>
                <p className="text-sm font-medium uppercase tracking-wide text-primary">
                  {eyebrow}
                </p>
              </FadeIn>
            )}
            {headline && (
              <FadeIn delay={0.05}>
                <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  {headline}
                </h2>
              </FadeIn>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {content.items.map((item, idx) => (
            <FadeIn key={`${item.authorName}-${idx}`} delay={Math.min(idx * 0.08, 0.3)}>
              <Card className="h-full border-border/60 bg-card/60">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <Quote className="size-6 text-primary/50" />
                  <p className="flex-1 text-sm leading-relaxed text-foreground">{item.quote}</p>
                  <div className="flex items-center gap-3 border-t border-border/40 pt-4">
                    <div className="inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-primary">
                      {item.authorName
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="text-xs leading-tight">
                      <div className="font-medium text-foreground">{item.authorName}</div>
                      <div className="text-muted-foreground">
                        {item.authorRole} · {item.authorCompany}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
