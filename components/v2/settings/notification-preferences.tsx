'use client';

import {
  type NotificationPrefsState,
  updateNotificationSettingsAction,
} from '@/app/[locale]/(app)/settings/notifications/preferences/actions';
import type { NotificationSettings } from '@/platform/notifications/settings';
import { Save } from 'lucide-react';
import { useActionState, useState } from 'react';

export type NotificationPrefsLabels = {
  email: string;
  thresholds: string;
  scope: string;
  save: string;
  saving: string;
  saved: string;
  errorPrefix: string;
  invoiceSent: { name: string; desc: string };
  paymentReceived: { name: string; desc: string };
  lowStockAlert: { name: string; desc: string };
  overduePayment: { name: string; desc: string };
  lowStockThreshold: { name: string; desc: string };
  overdueDaysThreshold: { name: string; desc: string };
};

type ToggleKey = 'invoiceSent' | 'paymentReceived' | 'lowStockAlert' | 'overduePayment';

function Toggle({
  name,
  label,
  desc,
  initial,
}: {
  name: ToggleKey;
  label: string;
  desc: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  return (
    <div className="nf-row">
      <div className="meta">
        <div className="name">{label}</div>
        <div className="desc">{desc}</div>
      </div>
      <button
        type="button"
        aria-label={label}
        aria-pressed={on}
        className={`tog${on ? ' is-on' : ''}`}
        onClick={() => setOn(!on)}
      />
      <input type="hidden" name={name} value={on ? 'on' : ''} />
    </div>
  );
}

/**
 * Notification preferences — the four email toggles + two thresholds that the
 * dispatch-* senders actually consume. Persists via
 * `updateNotificationSettingsAction`. No decorative channels, no quiet hours
 * (none of which had a backend).
 */
export function V2NotificationPreferences({
  settings,
  labels,
}: {
  settings: NotificationSettings;
  labels: NotificationPrefsLabels;
}) {
  const [state, formAction, pending] = useActionState<NotificationPrefsState, FormData>(
    updateNotificationSettingsAction,
    null,
  );

  return (
    <form action={formAction}>
      <div className="action-bar">
        <div className="left">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Save size={16} strokeWidth={1.75} />
            {pending ? labels.saving : labels.save}
          </button>
          {state?.ok ? <span className="dim">{labels.saved}</span> : null}
          {state && !state.ok ? (
            <span style={{ color: 'var(--danger, #c33)' }}>
              {labels.errorPrefix} {state.error}
            </span>
          ) : null}
        </div>
        <div className="right">{labels.scope}</div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">{labels.email}</div>
        </div>
        <Toggle
          name="invoiceSent"
          label={labels.invoiceSent.name}
          desc={labels.invoiceSent.desc}
          initial={settings.invoiceSent}
        />
        <Toggle
          name="paymentReceived"
          label={labels.paymentReceived.name}
          desc={labels.paymentReceived.desc}
          initial={settings.paymentReceived}
        />
        <Toggle
          name="lowStockAlert"
          label={labels.lowStockAlert.name}
          desc={labels.lowStockAlert.desc}
          initial={settings.lowStockAlert}
        />
        <Toggle
          name="overduePayment"
          label={labels.overduePayment.name}
          desc={labels.overduePayment.desc}
          initial={settings.overduePayment}
        />
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{labels.thresholds}</div>
        </div>
        <div className="form-grid">
          <label htmlFor="lowStockThreshold">{labels.lowStockThreshold.name}</label>
          <div className="field">
            <input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              className="input mono"
              min={0}
              max={10_000}
              defaultValue={settings.lowStockThreshold}
              style={{ maxWidth: 180 }}
            />
            <div className="field-hint">{labels.lowStockThreshold.desc}</div>
          </div>
          <label htmlFor="overdueDaysThreshold">{labels.overdueDaysThreshold.name}</label>
          <div className="field">
            <input
              id="overdueDaysThreshold"
              name="overdueDaysThreshold"
              type="number"
              className="input mono"
              min={1}
              max={365}
              defaultValue={settings.overdueDaysThreshold}
              style={{ maxWidth: 180 }}
            />
            <div className="field-hint">{labels.overdueDaysThreshold.desc}</div>
          </div>
        </div>
      </section>
    </form>
  );
}
