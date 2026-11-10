'use client';

import { PlanLimitDialog, isPlanLimitError } from '@/components/v2/shared/plan-limit-dialog';
import { useRouter } from '@/platform/i18n/navigation';
import { AlertTriangle, Send } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { type InviteState, inviteMemberV2Action } from './invite-actions';

export type SystemRoleOption = {
  value:
    | 'admin'
    | 'viewer'
    | 'bookkeeper'
    | 'sales'
    | 'warehouse'
    | 'chief_accountant'
    | 'cashier'
    | 'buyer';
  label: string;
};

export type InviteFormProps = {
  labels: {
    sendCta: string;
    copyLink: string;
    cancel: string;
    cancelHref: string;
    validityHint: string;
    sectionTitle: string;
    fields: {
      email: string;
      emailPh: string;
      emailHint: string;
      name: string;
      namePh: string;
      role: string;
      roleHint: string;
      roleHintLinkLabel: string;
      scope: string;
      scopeOptions: string[];
      message: string;
      messageHint: string;
      twoFactor: string;
      twoFactorYes: string;
      twoFactorNo: string;
      twoFactorHint: string;
      inviteLink: string;
    };
    previewTitle: string;
    previewLocale: string;
    previewHeadFrom: string;
    previewHeadDate: string;
    previewHeadline: string;
    previewIntro: string;
    previewMessage: string;
    previewCta: string;
    previewLinkLabel: string;
    previewFoot: string;
  };
  defaults: {
    email: string;
    name: string;
    message: string;
    inviteLink: string;
  };
  rolesOptions: SystemRoleOption[];
};

export function V2InviteForm(p: InviteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    inviteMemberV2Action,
    null,
  );
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) {
      router.push(p.labels.cancelHref);
    }
  }, [state, router, p.labels.cancelHref]);

  const error = state && !state.ok ? state.error : undefined;
  const isPlanLimit = isPlanLimitError(error);

  return (
    <form action={formAction}>
      <div className="action-bar">
        <div className="left">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Send size={14} strokeWidth={1.75} />
            {pending ? '…' : p.labels.sendCta}
          </button>
          <button type="button" className="btn btn-secondary">
            {p.labels.copyLink}
          </button>
          <Link href={p.labels.cancelHref} className="btn btn-ghost">
            {p.labels.cancel}
          </Link>
        </div>
        <div className="right">{p.labels.validityHint}</div>
      </div>

      {error && !isPlanLimit ? (
        <div className="field-error" style={{ marginBottom: 12 }}>
          <AlertTriangle size={12} strokeWidth={1.75} />
          {error}
        </div>
      ) : null}
      {isPlanLimit ? <PlanLimitDialog token={state} /> : null}

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">{p.labels.sectionTitle}</div>
          </div>
          <div className="form-grid">
            <label htmlFor="invite-email">{p.labels.fields.email}</label>
            <div className="field">
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                className="input"
                placeholder={p.labels.fields.emailPh}
                defaultValue={p.defaults.email}
                onChange={(e) => setSentEmail(e.target.value)}
              />
              <div className="field-hint">{p.labels.fields.emailHint}</div>
            </div>

            <label htmlFor="invite-name">{p.labels.fields.name}</label>
            <div className="field">
              <input
                id="invite-name"
                className="input"
                placeholder={p.labels.fields.namePh}
                defaultValue={p.defaults.name}
              />
            </div>

            <label htmlFor="invite-role">{p.labels.fields.role}</label>
            <div className="field">
              <select
                id="invite-role"
                name="systemRole"
                className="select"
                defaultValue={p.rolesOptions[0]?.value ?? 'viewer'}
              >
                {p.rolesOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div className="field-hint">
                {p.labels.fields.roleHint}{' '}
                <Link href="/admin/roles" style={{ color: 'var(--text)' }}>
                  {p.labels.fields.roleHintLinkLabel}
                </Link>
                .
              </div>
            </div>

            {/* biome-ignore lint/a11y/noLabelWithoutControl: form-grid label paired with sibling chip-row buttons */}
            <label>{p.labels.fields.scope}</label>
            <div className="field">
              <div
                className="chip-row"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              >
                {p.labels.fields.scopeOptions.map((opt, idx) => (
                  <button
                    type="button"
                    key={opt}
                    className={`chip${idx === 0 ? ' is-active' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <label htmlFor="invite-msg">{p.labels.fields.message}</label>
            <div className="field">
              <textarea
                id="invite-msg"
                className="textarea"
                rows={4}
                defaultValue={p.defaults.message}
              />
              <div className="field-hint">{p.labels.fields.messageHint}</div>
            </div>

            {/* biome-ignore lint/a11y/noLabelWithoutControl: form-grid label paired with sibling chip-row buttons */}
            <label>{p.labels.fields.twoFactor}</label>
            <div className="field">
              <div
                className="chip-row"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              >
                <button type="button" className="chip is-active">
                  {p.labels.fields.twoFactorYes}
                </button>
                <button type="button" className="chip">
                  {p.labels.fields.twoFactorNo}
                </button>
              </div>
              <div className="field-hint">{p.labels.fields.twoFactorHint}</div>
            </div>

            <label htmlFor="invite-link">{p.labels.fields.inviteLink}</label>
            <div className="field">
              <input
                id="invite-link"
                className="input mono"
                defaultValue={p.defaults.inviteLink}
                disabled
              />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">{p.labels.previewTitle}</div>
            <span className="dim" style={{ fontSize: 12 }}>
              {p.labels.previewLocale}
            </span>
          </div>

          <div className="email-preview">
            <div className="head">
              <span className="dot" style={{ background: 'var(--danger)' }} />
              <span className="dot" style={{ background: 'var(--warning)' }} />
              <span className="dot" style={{ background: 'var(--success)' }} />
              <span style={{ marginLeft: 8 }}>
                <b style={{ color: 'var(--text)' }}>{p.labels.previewHeadFrom}</b>{' '}
                {sentEmail ?? 'noreply@ishflow.com'}
              </span>
              <span style={{ marginLeft: 'auto' }}>{p.labels.previewHeadDate}</span>
            </div>
            <div className="body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--accent)',
                    color: 'var(--accent-on)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  i
                </div>
                <b style={{ color: 'var(--text)' }}>ishflow</b>
              </div>

              <h2>{p.labels.previewHeadline}</h2>

              <p style={{ color: 'var(--text-muted)' }}>{p.labels.previewIntro}</p>

              <div className="quote">{p.labels.previewMessage}</div>

              <button type="button" className="cta">
                {p.labels.previewCta}
              </button>

              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                {p.labels.previewLinkLabel}
                <br />
                <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {p.defaults.inviteLink}
                </span>
              </p>

              <div className="foot">{p.labels.previewFoot}</div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
