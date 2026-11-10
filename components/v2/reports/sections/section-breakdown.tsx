import { V2BreakdownTable } from '@/components/v2/data/breakdown-table';
import type { Locale, ReportBreakdownSection } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared';

/**
 * Render a `breakdown` section — wraps `V2BreakdownTable` mapping
 * LocalizedLabel → resolved strings for the active locale.
 */
export function SectionBreakdown({
  section,
  locale,
  fallbackTitle,
  moreLabel,
}: {
  section: ReportBreakdownSection;
  locale: Locale;
  /** Used if `section.title` is undefined. */
  fallbackTitle: string;
  /** "Show more" label — enables row paging on long tables. */
  moreLabel?: string;
}) {
  return (
    <V2BreakdownTable
      title={section.title ? pickLabel(section.title, locale) : fallbackTitle}
      dimensions={(section.dimensions ?? []).map((d) => ({
        key: d.key,
        label: pickLabel(d.label, locale),
      }))}
      columns={section.columns.map((c) => ({
        key: c.key,
        label: pickLabel(c.label, locale),
        align: c.align,
      }))}
      rows={section.rows}
      totalsRow={section.totalsRow}
      moreLabel={moreLabel}
    />
  );
}
