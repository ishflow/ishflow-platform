export type SaKpiCardProps = {
  label: string;
  value: string;
  /**
   * Optional change indicator. `direction` controls arrow + color class; omit
   * the whole prop for a value-only card (no change row). Use `text` when the
   * delta isn't a percentage (e.g. "▲ 2", "▼ 0.4 pp").
   */
  change?: {
    direction: 'up' | 'down' | 'flat';
    text: string;
    note?: string;
  };
  /**
   * Footer note shown without an arrow (used by cards that show context only,
   * like "Average response 2h 14m"). Mutually exclusive with `change`.
   */
  note?: string;
  /** Optional trailing pill displayed next to the value (e.g. "3 high"). */
  valueBadge?: string;
};

export function SaKpiCard({ label, value, change, note, valueBadge }: SaKpiCardProps) {
  const arrow = change?.direction === 'up' ? '▲' : change?.direction === 'down' ? '▼' : '';
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {valueBadge ? (
          <span className="badge" style={{ fontSize: 11, verticalAlign: 'middle', marginLeft: 6 }}>
            {valueBadge}
          </span>
        ) : null}
      </div>
      {change ? (
        <div className={`change ${change.direction === 'flat' ? '' : change.direction}`}>
          <span className="pct">
            {arrow ? `${arrow} ` : ''}
            {change.text}
          </span>
          {change.note ? <span className="note">{change.note}</span> : null}
        </div>
      ) : note ? (
        <div className="change">
          <span className="note">{note}</span>
        </div>
      ) : null}
    </div>
  );
}
