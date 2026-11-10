import { type KpiCardProps, V2KpiCard } from './kpi-card';

export type KpiStripProps = {
  items: KpiCardProps[];
};

export function V2KpiStrip({ items }: KpiStripProps) {
  return (
    <section className="kpi-grid">
      {items.map((kpi, i) => (
        <V2KpiCard key={`${kpi.label}-${i}`} {...kpi} />
      ))}
    </section>
  );
}
