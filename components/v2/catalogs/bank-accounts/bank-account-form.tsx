'use client';

import { useRouter } from '@/platform/i18n/navigation';
import { AlertTriangle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { createBankAccount } from './actions';

/**
 * Minimal create form for a bank account (QA H11b#81). Bespoke rather than the
 * generic `V2EntityForm` because the legacy `BankAccount` table isn't engine-
 * managed (no deletedAt, NOT-NULL currency handled server-side).
 */
export function BankAccountForm({ listHref }: { listHref: string }) {
  const t = useTranslations('v2_catalogs.bankAccounts');
  const tc = useTranslations('v2_catalogs.common');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', accountNo: '', bankName: '', bic: '' });

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createBankAccount(locale, form);
      if (res.ok) {
        router.push(listHref);
        router.refresh();
      } else {
        const key = `errors.${res.error}`;
        const msg = t.has(key) ? t(key) : res.error;
        setError(msg);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="action-bar">
        <div className="left">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? tc('saving') : tc('save')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push(listHref)}>
            {tc('cancel')}
          </button>
        </div>
      </div>

      {error ? (
        <div className="field-error" style={{ marginBottom: 12 }}>
          <AlertTriangle size={12} strokeWidth={1.75} />
          {error}
        </div>
      ) : null}

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">{t('title')}</div>
          </div>
          <div className="form-grid">
            <label htmlFor="ba-name">
              {t('name')}
              <span style={{ color: 'var(--danger)' }}> *</span>
            </label>
            <div className="field">
              <input
                id="ba-name"
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={128}
                required
              />
            </div>

            <label htmlFor="ba-bank">{t('bankName')}</label>
            <div className="field">
              <input
                id="ba-bank"
                className="input"
                value={form.bankName}
                onChange={(e) => set('bankName', e.target.value)}
                maxLength={128}
              />
            </div>

            <label htmlFor="ba-accountNo">
              {t('accountNo')}
              <span style={{ color: 'var(--danger)' }}> *</span>
            </label>
            <div className="field">
              <input
                id="ba-accountNo"
                className="input mono"
                value={form.accountNo}
                onChange={(e) => set('accountNo', e.target.value)}
                maxLength={64}
                required
              />
            </div>

            <label htmlFor="ba-bic">{t('bic')}</label>
            <div className="field">
              <input
                id="ba-bic"
                className="input"
                value={form.bic}
                onChange={(e) => set('bic', e.target.value)}
                maxLength={32}
              />
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
