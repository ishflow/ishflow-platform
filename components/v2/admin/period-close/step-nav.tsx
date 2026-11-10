import { Check } from 'lucide-react';
import Link from 'next/link';

export type StepKey = 'checklist' | 'reconciliation' | 'approval';

export type V2PeriodCloseStepsProps = {
  active: StepKey;
  labels: Record<StepKey, { label: string; meta: string }>;
};

const ORDER: StepKey[] = ['checklist', 'reconciliation', 'approval'];
const HREF: Record<StepKey, string> = {
  checklist: '/admin/period-close/checklist',
  reconciliation: '/admin/period-close/reconciliation',
  approval: '/admin/period-close/approval',
};

export function V2PeriodCloseSteps({ active, labels }: V2PeriodCloseStepsProps) {
  const activeIdx = ORDER.indexOf(active);
  return (
    <nav className="wizard-steps">
      {ORDER.map((key, idx) => {
        const state = idx < activeIdx ? 'is-done' : idx === activeIdx ? 'is-active' : '';
        return (
          <Link key={key} href={HREF[key]} className={`wstep ${state}`}>
            <span className="n">
              {state === 'is-done' ? <Check size={12} strokeWidth={3} /> : idx + 1}
            </span>
            <div className="lbl">{labels[key].label}</div>
            <div className="meta">{labels[key].meta}</div>
          </Link>
        );
      })}
    </nav>
  );
}
