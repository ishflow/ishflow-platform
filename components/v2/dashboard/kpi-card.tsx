export type KpiCardProps = {
  label: string;
  value: string;
  changePct: number;
  changeNote: string;
};

export function V2KpiCard({ label, value, changePct, changeNote }: KpiCardProps) {
  const isUp = changePct >= 0;
  const arrow = isUp ? '▲' : '▼';
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className={`change ${isUp ? 'up' : 'down'}`}>
        <span className="pct">
          {arrow} {Math.abs(changePct).toFixed(1)}%
        </span>
        <span className="note">{changeNote}</span>
      </div>
    </div>
  );
}
