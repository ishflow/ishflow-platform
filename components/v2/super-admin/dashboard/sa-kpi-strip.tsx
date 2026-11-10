import { SaKpiCard, type SaKpiCardProps } from './sa-kpi-card';

export type SaKpiStripProps = {
  items: SaKpiCardProps[];
  /**
   * Override grid template (e.g. `'repeat(3, 1fr)'`). Defaults to the global
   * `.kpi-grid` style from variant-9 CSS (4 columns at desktop width).
   */
  columns?: string;
};

export function SaKpiStrip({ items, columns }: SaKpiStripProps) {
  return (
    <section className="kpi-grid" style={columns ? { gridTemplateColumns: columns } : undefined}>
      {items.map((kpi, i) => (
        <SaKpiCard key={`${kpi.label}-${i}`} {...kpi} />
      ))}
    </section>
  );
}
