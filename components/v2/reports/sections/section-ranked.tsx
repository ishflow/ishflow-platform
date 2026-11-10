import { V2RankedList } from '@/components/v2/data/ranked-list';
import type { Locale, ReportRankedSection } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared';

/**
 * Render a `ranked` section — wraps `V2RankedList` mapping the DSL's
 * `amount` field to the component's `amountLabel`, dropping the
 * presentational `tone` (the V2 component handles tone via meta).
 */
export function SectionRanked({
  section,
  locale,
  fallbackTitle,
}: {
  section: ReportRankedSection;
  locale: Locale;
  /** Used if `section.title` is undefined. */
  fallbackTitle: string;
}) {
  return (
    <V2RankedList
      title={section.title ? pickLabel(section.title, locale) : fallbackTitle}
      items={section.items.map((it) => ({
        id: it.id,
        initials: it.initials,
        name: it.name,
        meta: it.meta ?? '',
        fillPct: it.fillPct,
        amountLabel: it.amount,
      }))}
    />
  );
}
