import './data.css';

export type AgingBucket = {
  key: string;
  label: string;
  value: string;
  count: string;
  fillPct: number;
  tone: 'ok' | 'warn' | 'danger';
};

export function V2AgingBuckets({ buckets }: { buckets: AgingBucket[] }) {
  return (
    <div className="aging-bars">
      {buckets.map((b) => (
        <div
          key={b.key}
          className={`aging-bucket${b.tone === 'warn' ? ' warn' : b.tone === 'danger' ? ' danger' : ''}`}
        >
          <span className="lbl">{b.label}</span>
          <span className="val">{b.value}</span>
          <span className="count">{b.count}</span>
          <div className="bar" aria-hidden>
            <span style={{ width: `${Math.max(0, Math.min(100, b.fillPct))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
