import { AlertTriangle, Check, X } from 'lucide-react';

export type ProgressRow = {
  entity: string;
  done: number;
  total: number;
  state: 'done' | 'progress' | 'failed';
  errorCount?: number;
};

export type V2BulkImportProgressProps = {
  labels: {
    cardTitle: string;
    overall: string;
    cols: { entity: string; progress: string; state: string };
    stateDone: string;
    stateInProgress: string;
    stateFailed: string;
    errorsHint: string;
    cancelCta: string;
    finishCta: string;
  };
  rows: ProgressRow[];
  startedAt: string;
};

export function V2BulkImportProgress(p: V2BulkImportProgressProps) {
  const totalDone = p.rows.reduce((acc, r) => acc + r.done, 0);
  const totalAll = p.rows.reduce((acc, r) => acc + r.total, 0);
  const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">{p.labels.cardTitle}</div>
        <span className="dim" style={{ fontSize: 12 }}>
          {p.startedAt}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="dim" style={{ fontSize: 11.5, marginBottom: 6 }}>
          {p.labels.overall}: {totalDone} / {totalAll} ({pct}%)
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 999,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--accent)',
            }}
          />
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>{p.labels.cols.entity}</th>
            <th>{p.labels.cols.progress}</th>
            <th>{p.labels.cols.state}</th>
          </tr>
        </thead>
        <tbody>
          {p.rows.map((r) => (
            <tr key={r.entity}>
              <td>{r.entity}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 120,
                      height: 6,
                      borderRadius: 999,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(r.done / r.total) * 100}%`,
                        height: '100%',
                        background: r.state === 'failed' ? 'var(--danger-text)' : 'var(--accent)',
                      }}
                    />
                  </div>
                  <span className="mono dim" style={{ fontSize: 11.5 }}>
                    {r.done}/{r.total}
                  </span>
                </div>
              </td>
              <td>
                {r.state === 'done' ? (
                  <span className="pill pill-success">
                    <Check size={11} strokeWidth={2.5} /> {p.labels.stateDone}
                  </span>
                ) : r.state === 'failed' ? (
                  <span className="pill pill-danger">
                    <X size={11} strokeWidth={2.5} /> {p.labels.stateFailed}
                    {r.errorCount ? ` (${r.errorCount})` : ''}
                  </span>
                ) : (
                  <span className="pill pill-warning">
                    <AlertTriangle size={11} strokeWidth={2} /> {p.labels.stateInProgress}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="spacer" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="dim" style={{ fontSize: 12 }}>
          {p.labels.errorsHint}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm">
            {p.labels.cancelCta}
          </button>
          <button type="button" className="btn btn-primary btn-sm">
            {p.labels.finishCta}
          </button>
        </div>
      </div>
    </section>
  );
}
