import { cn } from '@/lib/utils';
import type { PricingComparisonContent } from '@/platform/marketing/types';
import { Check, Minus } from 'lucide-react';

export function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="size-4 text-primary mx-auto" />;
  if (v === false) return <Minus className="size-4 text-marketing-fg-3 mx-auto" />;
  return <span className="text-sm">{v}</span>;
}

export function ComparisonTable({ content }: { content: PricingComparisonContent }) {
  return (
    <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] bg-marketing-bg-2/40">
        <div className="p-4 font-display text-sm">Возможности</div>
        {content.tierNames.map((n, i) => (
          <div
            key={n}
            className={cn('p-4 text-center border-l border-border', i === 2 && 'bg-primary/5')}
          >
            <div className="font-display font-semibold">{n}</div>
            <div className="text-xs text-marketing-fg-3 mt-1">{content.tierPrices[i]}</div>
          </div>
        ))}
      </div>
      {content.sections.map((sec, si) => (
        <div key={`${sec.section}-${si}`}>
          <div className="bg-marketing-bg-3/30 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-marketing-fg-3 border-t border-border">
            {sec.section}
          </div>
          {sec.rows.map((row, ri) => (
            <div
              key={`${row.feature}-${ri}`}
              className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] text-sm border-t border-border"
            >
              <div className="p-3 text-marketing-fg-2">{row.feature}</div>
              {row.values.map((v, vi) => (
                <div
                  key={`${row.feature}-${vi}`}
                  className={cn(
                    'p-3 border-l border-border text-center',
                    vi === 2 && 'bg-primary/5',
                  )}
                >
                  <Cell v={v} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
