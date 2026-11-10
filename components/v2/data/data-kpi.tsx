import './data.css';

export type DataKpiItem = {
  label: string;
  value: string;
  /** Pre-formatted change snippet (e.g. "▲ 23.0%", "4 fatura", "▼ 12.0%"). */
  change?: string;
  /** Optional secondary note (e.g. "Aylık"). */
  note?: string;
  /** "up" colors green, "down" colors red, undefined = neutral. */
  tone?: 'up' | 'down' | 'neutral';
};

/**
 * Flexible KPI strip for registers + reports.
 *
 * Variant-9 KPI cards take many forms (`▲ 23%`, `4 fatura`, `▲ 2 puan`,
 * `$620K · 300 satış`). The dashboard V2KpiCard hardcodes percent formatting
 * — this card accepts a pre-formatted `change` string so the caller controls
 * the exact text shown.
 */
export function V2DataKpiStrip({ items, columns }: { items: DataKpiItem[]; columns?: 3 | 4 }) {
  const cls = columns === 3 ? 'grid-3' : 'kpi-grid';
  return (
    <section className={cls}>
      {items.map((it, i) => (
        <div className="kpi" key={`${it.label}-${i}`}>
          <div className="label">{it.label}</div>
          <div className="value">{it.value}</div>
          {it.change || it.note ? (
            <div className={`change ${it.tone === 'down' ? 'down' : 'up'}`}>
              {it.change ? <span className="pct">{it.change}</span> : null}
              {it.note ? <span className="note">{it.note}</span> : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
