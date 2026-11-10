import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { V2PeriodCloseSteps } from './step-nav';
import type { StepKey } from './step-nav';

export type V2PeriodApprovalProps = {
  labels: {
    stepNav: Record<StepKey, { label: string; meta: string }>;
    cardTitle: string;
    warnTitle: string;
    warnBody: string;
    summary: Array<{ label: string; value: string }>;
    approvalLabel: string;
    approvalHint: string;
    approver: string;
    approverEmail: string;
    ackText: string;
    closeCta: string;
    backCta: string;
  };
};

export function V2PeriodApproval(p: V2PeriodApprovalProps) {
  return (
    <>
      <V2PeriodCloseSteps active="approval" labels={p.labels.stepNav} />
      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.cardTitle}</div>
        </div>
        <div className="warn-block">
          <div className="ttl">
            <AlertTriangle size={14} strokeWidth={1.75} />
            {p.labels.warnTitle}
          </div>
          {p.labels.warnBody}
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

        <div className="spacer" />

        <div className="form-grid">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: form-grid label paired with approver chip */}
          <label>{p.labels.approvalLabel}</label>
          <div className="field">
            <div
              className="suggest"
              style={{ background: 'var(--surface)', cursor: 'default', marginTop: 0 }}
            >
              <div className="av">МК</div>
              <div className="who">
                <div className="nm">{p.labels.approver}</div>
                <div className="em">{p.labels.approverEmail}</div>
              </div>
              <span className="role-tag">{p.labels.approvalHint}</span>
            </div>
          </div>
        </div>

        <label className="chk-row" style={{ marginTop: 14 }}>
          <input type="checkbox" />
          <div className="body">{p.labels.ackText}</div>
        </label>
      </section>

      <div className="action-bar" style={{ marginTop: 18 }}>
        <div className="left">
          <Link href="/admin/period-close/reconciliation" className="btn btn-ghost">
            <ArrowLeft size={14} strokeWidth={1.75} />
            {p.labels.backCta}
          </Link>
        </div>
        <div className="right">
          <Link href="/admin/period-close/closed-status" className="btn btn-danger">
            <Lock size={14} strokeWidth={1.75} />
            {p.labels.closeCta}
          </Link>
        </div>
      </div>
    </>
  );
}
