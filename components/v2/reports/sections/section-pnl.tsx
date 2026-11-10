import { V2PnLTable } from '@/components/v2/data/pnl-table';
import type { Locale, ReportPnlSection } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared';

/**
 * Render a `pnl` section — wraps `V2PnLTable` translating the DSL's
 * direction-based delta into the component's `tone` (up/down) flag and
 * `prior` into `previous`.
 */
export function SectionPnl({
  section,
  locale,
  columnLabels,
}: {
  section: ReportPnlSection;
  locale: Locale;
  columnLabels: { item: string; current: string; previous: string; delta: string };
}) {
  return (
    <V2PnLTable
      columns={columnLabels}
      rows={section.rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        label: pickLabel(r.label, locale),
        current: r.current,
        previous: r.prior ?? '',
        delta: r.delta ? { value: r.delta.formatted, tone: r.delta.direction } : undefined,
      }))}
    />
  );
}
