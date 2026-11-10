import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { V2PeriodCloseSteps } from './step-nav';
import type { StepKey } from './step-nav';

export type ChecklistItem = {
  id: string;
  state: 'done' | 'warn' | 'open';
  title: string;
  meta?: string;
  cta?: string;
};

export type V2PeriodChecklistProps = {
  labels: {
    stepNav: Record<StepKey, { label: string; meta: string }>;
    cardTitle: string;
    cardSub: string;
    nextCta: string;
    backCta: string;
  };
  items: ChecklistItem[];
};

export function V2PeriodChecklist(p: V2PeriodChecklistProps) {
  return (
    <>
      <V2PeriodCloseSteps active="checklist" labels={p.labels.stepNav} />
      <section className="check-section">
        <div className="card-header" style={{ padding: 0, marginBottom: 14, border: 0 }}>
          <div className="card-title">{p.labels.cardTitle}</div>
          <div className="dim" style={{ fontSize: 12 }}>
            {p.labels.cardSub}
          </div>
        </div>
        {p.items.map((item) => (
          <div key={item.id} className={`check-line is-${item.state}`}>
            <span className="bullet">
              {item.state === 'done' ? (
                <Check size={13} strokeWidth={3} />
              ) : item.state === 'warn' ? (
                <AlertTriangle size={13} strokeWidth={2} />
              ) : null}
            </span>
            <div className="body">
              <div className="ttl">{item.title}</div>
              {item.meta ? <div className="meta">{item.meta}</div> : null}
            </div>
            {item.cta ? (
              <button type="button" className="btn btn-ghost btn-sm">
                {item.cta}
              </button>
            ) : null}
          </div>
        ))}
      </section>
      <div className="action-bar" style={{ marginTop: 18 }}>
        <div className="left">
          <Link href="/admin/period-close" className="btn btn-ghost">
            {p.labels.backCta}
          </Link>
        </div>
        <div className="right">
          <Link href="/admin/period-close/reconciliation" className="btn btn-primary">
            {p.labels.nextCta}
            <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </>
  );
}
