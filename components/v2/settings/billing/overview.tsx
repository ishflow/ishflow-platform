'use client';

import { PLAN_DISPLAY_PRICES } from '@/platform/billing/display-prices';
import { PLAN_FEATURES, PLAN_LIMITS } from '@/platform/billing/plans';
import type { TenantPlan } from '@prisma/client';
import { AlertTriangle, Check, CreditCard, ExternalLink } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { RequestUpgradeDialog } from './request-upgrade-dialog';

export type PlanKey = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
type TenantStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'cancelled' | 'deleted';

// Tiles are derived from the single source of truth (PLAN_LIMITS / PLAN_FEATURES
// / PLAN_DISPLAY_PRICES) — never hand-written copy. Prices shown in USD; the
// authoritative amount still comes from Stripe at checkout.
const ORDER: TenantPlan[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
const UNLIMITED = Number.MAX_SAFE_INTEGER;
const fmtNum = (n: number): string => (n === UNLIMITED ? '∞' : n.toLocaleString('en-US'));
const fmtGb = (bytes: number): string =>
  bytes === UNLIMITED ? '∞' : String(Math.round(bytes / 1024 ** 3));

export function V2BillingOverview({
  planKey,
  status,
  seats,
  trialEndsAt,
  stripeConfigured,
  paymentsEnabled,
  companyName,
  contactEmail,
}: {
  planKey: PlanKey;
  status: TenantStatus;
  seats: number;
  trialEndsAt: string | null;
  stripeConfigured: boolean;
  paymentsEnabled: boolean;
  companyName: string;
  contactEmail: string;
}) {
  const t = useTranslations('v2_settings.billing.overview');
  const format = useFormatter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const planName = t(`plan_${planKey}` as 'plan_free');
  const statusLabel = t(`st_${status}` as 'st_active');

  function checkout(plan: 'starter' | 'pro' | 'business') {
    if (!stripeConfigured) {
      setErr(t('notConfigured'));
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/billing/checkout-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ plan, interval: 'month' }),
        });
        const data = (await res.json().catch(() => null)) as { url?: string } | null;
        if (res.ok && data?.url) {
          window.location.assign(data.url);
          return;
        }
        setErr(t('notConfigured'));
      } catch {
        setErr(t('notConfigured'));
      }
    });
  }

  function portal() {
    if (!stripeConfigured) {
      setErr(t('notConfigured'));
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/billing/portal-session', { method: 'POST' });
        const data = (await res.json().catch(() => null)) as { url?: string } | null;
        if (res.ok && data?.url) {
          window.location.assign(data.url);
          return;
        }
        setErr(t('notConfigured'));
      } catch {
        setErr(t('notConfigured'));
      }
    });
  }

  return (
    <>
      {!stripeConfigured ? (
        <div
          className="card"
          style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}
        >
          <AlertTriangle size={16} strokeWidth={1.75} style={{ color: 'var(--warning-text)' }} />
          <span className="dim">{t('notConfigured')}</span>
        </div>
      ) : null}

      <section className="plan-hero">
        <div>
          <div className="label">{t('currentPlan')}</div>
          <div className="name">{planName}</div>
          <div className="price">
            <span className="pill pill-info">{statusLabel}</span> {t('members', { count: seats })}
          </div>
          {status === 'trialing' && trialEndsAt ? (
            <div className="renew">
              {t('trialEnds', {
                date: format.dateTime(new Date(trialEndsAt), { dateStyle: 'medium' }),
              })}
            </div>
          ) : null}
        </div>
        <div className="right">
          {paymentsEnabled ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={portal}
              disabled={pending || !stripeConfigured}
            >
              <CreditCard size={16} strokeWidth={1.75} />
              {t('manage')}
            </button>
          ) : (
            <RequestUpgradeDialog
              companyName={companyName}
              contactEmail={contactEmail}
              triggerClassName="btn btn-primary"
              triggerLabel={t('requestUpgrade')}
            />
          )}
        </div>
      </section>

      {err ? <p style={{ color: 'var(--warning-text)', marginTop: 10 }}>{err}</p> : null}

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('plans')}</div>
        </div>
        <div className="plan-picker">
          {ORDER.map((id) => {
            const isCurrent = id === planKey;
            const limits = PLAN_LIMITS[id];
            const features = PLAN_FEATURES[id];
            return (
              <div key={id} className={`plan-tile${isCurrent ? ' is-current' : ''}`}>
                <div className="nm">{t(`plan_${id}` as 'plan_free')}</div>
                <div className="pr">{PLAN_DISPLAY_PRICES[id].month.USD}</div>
                <ul className="ft">
                  <li>
                    <Check size={12} strokeWidth={2.5} />
                    {t('feat.members', { n: fmtNum(limits.members) })}
                  </li>
                  <li>
                    <Check size={12} strokeWidth={2.5} />
                    {t('feat.docs', { n: fmtNum(limits.monthlyPostedDocs) })}
                  </li>
                  <li>
                    <Check size={12} strokeWidth={2.5} />
                    {t('feat.storage', { gb: fmtGb(limits.storageBytes) })}
                  </li>
                  {features.advancedReports ? (
                    <li>
                      <Check size={12} strokeWidth={2.5} />
                      {t('feat.advancedReports')}
                    </li>
                  ) : null}
                  {features.apiAccess ? (
                    <li>
                      <Check size={12} strokeWidth={2.5} />
                      {t('feat.apiAccess')}
                    </li>
                  ) : null}
                  {features.customBranding ? (
                    <li>
                      <Check size={12} strokeWidth={2.5} />
                      {t('feat.customBranding')}
                    </li>
                  ) : null}
                  {features.sso ? (
                    <li>
                      <Check size={12} strokeWidth={2.5} />
                      {t('feat.sso')}
                    </li>
                  ) : null}
                </ul>
                <div className="plan-cta">
                  {isCurrent ? (
                    <button className="btn btn-ghost btn-sm" disabled type="button">
                      {t('current')}
                    </button>
                  ) : id === 'enterprise' ? (
                    // Enterprise has no self-serve checkout — always a request/contact.
                    <RequestUpgradeDialog
                      companyName={companyName}
                      contactEmail={contactEmail}
                      defaultPlan="enterprise"
                      triggerClassName="btn btn-secondary btn-sm"
                      triggerLabel={t('requestThisPlan')}
                    />
                  ) : paymentsEnabled ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={pending || id === 'free'}
                      type="button"
                      onClick={() =>
                        id !== 'free' && checkout(id as 'starter' | 'pro' | 'business')
                      }
                    >
                      {id === 'free' ? t('free') : t('select')}
                    </button>
                  ) : (
                    <RequestUpgradeDialog
                      companyName={companyName}
                      contactEmail={contactEmail}
                      defaultPlan={id}
                      triggerClassName="btn btn-secondary btn-sm"
                      triggerLabel={t('requestThisPlan')}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('recentInvoices')}</div>
        </div>
        <p className="dim" style={{ padding: '8px 0' }}>
          {t('noInvoices')}
        </p>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('paymentMethod')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="dim">{t('noPaymentMethod')}</span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={portal}
            disabled={pending || !stripeConfigured}
          >
            {t('stripe')}
            <ExternalLink size={12} strokeWidth={1.75} />
          </button>
        </div>
      </section>
    </>
  );
}
