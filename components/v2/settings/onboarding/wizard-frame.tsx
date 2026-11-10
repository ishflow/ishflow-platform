import Link from 'next/link';
import type { ReactNode } from 'react';

type Step = 1 | 2 | 3 | 4 | 5;

export function V2OnboardingFrame({
  step,
  total,
  children,
}: {
  step: Step;
  total: number;
  children: ReactNode;
}) {
  return (
    <div className="onb">
      <header className="onb-top">
        <Link className="onb-brand" href="/onboarding/welcome">
          <span className="onb-mark">i</span>
          <span>ishflow</span>
        </Link>
        <div className="onb-top-right">
          <div className="onb-progress" aria-label={`Adım ${step} / ${total}`}>
            {Array.from({ length: total }).map((_, i) => {
              const n = i + 1;
              const cls = n < step ? 'dot is-done' : n === step ? 'dot is-active' : 'dot';
              return <span key={n} className={cls} />;
            })}
            <span className="step">
              {step} / {total}
            </span>
          </div>
        </div>
      </header>

      <main className="onb-main">{children}</main>

      <div className="onb-foot">
        Yardım gerekirse <a href="mailto:support@ishflow.com">support@ishflow.com</a>
      </div>
    </div>
  );
}
