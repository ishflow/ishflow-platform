import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { V2PeriodCloseSteps } from './step-nav';
import type { StepKey } from './step-nav';

export type ReconciliationRow = {
  account: string;
  ledger: string;
  external: string;
  diff: string;
  state: 'ok' | 'diff';
};

export type V2PeriodReconciliationProps = {
  labels: {
    stepNav: Record<StepKey, { label: string; meta: string }>;
    cardTitle: string;
    cardSub: string;
    cols: { account: string; ledger: string; external: string; diff: string; state: string };
    stateOk: string;
    stateDiff: string;
    nextCta: string;
    backCta: string;
  };
  rows: ReconciliationRow[];
};

export function V2PeriodReconciliation(p: V2PeriodReconciliationProps) {
  return (
    <>
      <V2PeriodCloseSteps active="reconciliation" labels={p.labels.stepNav} />
      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.cardTitle}</div>
          <div className="dim" style={{ fontSize: 12 }}>
            {p.labels.cardSub}
          </div>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>{p.labels.cols.account}</th>
              <th className="num">{p.labels.cols.ledger}</th>
              <th className="num">{p.labels.cols.external}</th>
              <th className="num">{p.labels.cols.diff}</th>
              <th>{p.labels.cols.state}</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.account}>
                <td>{r.account}</td>
                <td className="num mono">{r.ledger}</td>
                <td className="num mono">{r.external}</td>
                <td className="num mono">{r.diff}</td>
                <td>
                  <span className={`pill pill-${r.state === 'ok' ? 'success' : 'warning'}`}>
                    {r.state === 'ok' ? (
                      <>
                        <Check size={11} strokeWidth={2.5} /> {p.labels.stateOk}
                      </>
                    ) : (
                      p.labels.stateDiff
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="action-bar" style={{ marginTop: 18 }}>
        <div className="left">
          <Link href="/admin/period-close/checklist" className="btn btn-ghost">
            <ArrowLeft size={14} strokeWidth={1.75} />
            {p.labels.backCta}
          </Link>
        </div>
        <div className="right">
          <Link href="/admin/period-close/approval" className="btn btn-primary">
            {p.labels.nextCta}
            <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </>
  );
}
