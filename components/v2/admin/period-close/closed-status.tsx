import { Lock, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export type V2PeriodClosedStatusProps = {
  labels: {
    bannerTitle: string;
    bannerBody: string;
    summaryTitle: string;
    summary: Array<{ label: string; value: string }>;
    revertCta: string;
    revertHint: string;
    backCta: string;
  };
};

export function V2PeriodClosedStatus(p: V2PeriodClosedStatusProps) {
  return (
    <>
      <section
        className="card"
        style={{
          background: 'var(--success-soft)',
          borderColor: 'var(--success-soft)',
          padding: 20,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--surface)',
              color: 'var(--success-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Lock size={20} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: 15 }}>
              {p.labels.bannerTitle}
            </div>
            <div style={{ color: 'var(--text)', fontSize: 13, marginTop: 4 }}>
              {p.labels.bannerBody}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.summaryTitle}</div>
        </div>
        <table className="data">
          <tbody>
            {p.labels.summary.map((row) => (
              <tr key={row.label}>
                <td className="dim" style={{ width: '40%' }}>
                  {row.label}
                </td>
                <td>
                  <strong>{row.value}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="action-bar" style={{ marginTop: 18 }}>
        <div className="left">
          <Link href="/admin/period-close" className="btn btn-ghost">
            {p.labels.backCta}
          </Link>
        </div>
        <div className="right">
          <span className="dim" style={{ fontSize: 12, marginRight: 12 }}>
            {p.labels.revertHint}
          </span>
          <button type="button" className="btn btn-secondary">
            <RotateCcw size={14} strokeWidth={1.75} />
            {p.labels.revertCta}
          </button>
        </div>
      </div>
    </>
  );
}
