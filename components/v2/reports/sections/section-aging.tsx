import { V2AgingBuckets } from '@/components/v2/data/aging-buckets';
import type { Locale, ReportAgingSection } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared';

/**
 * Render an `aging` section — wraps `V2AgingBuckets` mapping the DSL's
 * LocalizedLabel bucket labels + counts to resolved strings.
 */
export function SectionAging({
  section,
  locale,
}: {
  section: ReportAgingSection;
  locale: Locale;
}) {
  return (
    <V2AgingBuckets
      buckets={section.buckets.map((b) => ({
        key: b.key,
        label: pickLabel(b.label, locale),
        value: b.value,
        count: pickLabel(b.count, locale),
        fillPct: b.fillPct,
        tone: b.tone,
      }))}
    />
  );
}
