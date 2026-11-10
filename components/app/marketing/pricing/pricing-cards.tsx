'use client';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import type { PricingTier } from '@/platform/marketing/types';
import { Check } from 'lucide-react';
import { BorderBeam } from '../effects/border-beam';
import { FadeIn } from '../fade-in';

interface Props {
  tiers: PricingTier[];
  billing: 'month' | 'year';
  yearlyDiscountPct: number;
}

function applyDiscount(priceRaw: string, billing: 'month' | 'year', pct: number): string {
  if (billing !== 'year') return priceRaw;
  const numericMatch = priceRaw.match(/[\d\s]+/);
  if (!numericMatch) return priceRaw;
  const num = Number(numericMatch[0].replace(/\s/g, ''));
  if (Number.isNaN(num)) return priceRaw;
  const discounted = Math.round(num * (1 - pct / 100));
  return priceRaw.replace(numericMatch[0], discounted.toLocaleString('ru-RU'));
}

export function PricingCards({ tiers, billing, yearlyDiscountPct }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiers.map((t, i) => {
        const displayPrice =
          t.id === 'business' || t.id === 'free'
            ? t.price
            : applyDiscount(t.price, billing, yearlyDiscountPct);
        return (
          <FadeIn key={t.id} delay={i * 0.04}>
            <div
              className={cn(
                'relative flex h-full flex-col gap-5 rounded-2xl border bg-card p-6',
                t.featured ? 'border-primary shadow-elev-lg' : 'border-border',
              )}
            >
              {t.featured && <BorderBeam size={220} duration={14} />}
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                {t.featured && (
                  <span className="rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5">
                    Популярный
                  </span>
                )}
              </div>
              <div>
                <span className="font-display text-3xl font-semibold tracking-tight">
                  {displayPrice}
                </span>
                <span className="text-xs text-marketing-fg-3 ml-1">{t.priceSub}</span>
              </div>
              <p className="text-sm text-marketing-fg-2">{t.desc}</p>
              <ul className="space-y-2 text-sm flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={t.ctaHref}
                className={cn(
                  buttonVariants({ variant: t.featured ? 'default' : 'outline' }),
                  'w-full',
                )}
              >
                {t.ctaLabel}
              </Link>
            </div>
          </FadeIn>
        );
      })}
    </div>
  );
}
