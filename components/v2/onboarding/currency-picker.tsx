'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const OPTIONS = ['RUB', 'USD', 'EUR', 'TRY', 'KZT', 'KGS', 'UZS', 'CNY'] as const;
type Code = (typeof OPTIONS)[number];

export function V2OnboardingCurrencyPicker({
  onSubmit,
  initial,
}: {
  onSubmit: (code: Code) => Promise<void>;
  initial?: string;
}) {
  const t = useTranslations('v2_onboarding.currency');
  const [code, setCode] = useState<Code | ''>(
    initial && (OPTIONS as readonly string[]).includes(initial) ? (initial as Code) : '',
  );
  const [pending, setPending] = useState(false);

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">{t('title')}</div>
      </div>
      <p className="dim" style={{ marginTop: 8 }}>
        {t('subtitle')}
      </p>
      <div className="rate-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCode(c)}
            aria-pressed={code === c}
            className="rate-tile"
            style={{
              cursor: 'pointer',
              borderColor: code === c ? 'var(--accent)' : undefined,
              backgroundColor:
                code === c ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : undefined,
            }}
          >
            <div className="pair">{c}</div>
            <div className="val" style={{ fontSize: 18 }}>
              {t(`labels.${c}` as const)}
            </div>
          </button>
        ))}
      </div>
      <div className="action-bar" style={{ marginTop: 16 }}>
        <div />
        <button
          type="button"
          className="btn btn-primary"
          disabled={!code || pending}
          onClick={async () => {
            if (!code) return;
            setPending(true);
            try {
              await onSubmit(code);
            } finally {
              setPending(false);
            }
          }}
        >
          {t('cta')}
        </button>
      </div>
    </section>
  );
}
