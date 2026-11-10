import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import type { FeatureGridContent } from '@/platform/marketing/types';
import {
  ArrowUpRight,
  FileCheck2,
  Landmark,
  type LucideIcon,
  Receipt,
  ScanText,
  Tags,
  Warehouse,
  Workflow,
  Zap,
} from 'lucide-react';
import { FadeIn } from '../fade-in';

const ICONS: Record<string, LucideIcon> = {
  receipt: Receipt,
  warehouse: Warehouse,
  tags: Tags,
  'file-check-2': FileCheck2,
  'scan-text': ScanText,
  landmark: Landmark,
  workflow: Workflow,
  zap: Zap,
};

function pickIcon(key: string): LucideIcon {
  return ICONS[key] ?? Zap;
}

interface FeatureGridProps {
  content: FeatureGridContent;
  eyebrow?: string;
  headline?: string;
  body?: string;
}

export function FeatureGrid({ content, eyebrow, headline, body }: FeatureGridProps) {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || headline || body) && (
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
            {body && (
              <FadeIn delay={0.1}>
                <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
                  {body}
                </p>
              </FadeIn>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.cards.map((card, idx) => {
            const Icon = pickIcon(card.iconKey);
            const cardEl = (
              <Card
                className={cn(
                  'group h-full border-border/60 bg-card/60 backdrop-blur transition-all',
                  'hover:-translate-y-0.5 hover:border-border hover:shadow-lg hover:shadow-primary/5',
                )}
              >
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold tracking-tight">{card.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
                  </div>
                  {card.href && (
                    <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <span>{card.title}</span>
                      <ArrowUpRight className="size-3.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            return (
              <FadeIn key={`${card.title}-${idx}`} delay={Math.min(idx * 0.05, 0.3)}>
                {card.href ? <Link href={card.href}>{cardEl}</Link> : cardEl}
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
