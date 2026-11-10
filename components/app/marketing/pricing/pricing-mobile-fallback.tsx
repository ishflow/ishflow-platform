import type { PricingComparisonContent } from '@/platform/marketing/types';
import { Cell } from './comparison-table';

export function PricingMobileFallback({ content }: { content: PricingComparisonContent }) {
  return (
    <div className="md:hidden space-y-3">
      {content.tierNames.map((name, ti) => (
        <details key={name} className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer list-none flex items-center justify-between p-4">
            <span className="font-display font-medium">{name}</span>
            <span className="font-display">{content.tierPrices[ti]}</span>
          </summary>
          <div className="px-4 pb-4">
            {content.sections.map((sec, si) => (
              <div key={`${sec.section}-${si}`} className="mt-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-marketing-fg-3 mb-2">
                  {sec.section}
                </div>
                {sec.rows.map((r, ri) => (
                  <div
                    key={`${r.feature}-${ri}`}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-b-0"
                  >
                    <span className="text-marketing-fg-2">{r.feature}</span>
                    <Cell v={r.values[ti] ?? false} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
