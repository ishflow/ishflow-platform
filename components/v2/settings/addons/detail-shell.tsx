'use client';

import { Check, ExternalLink, MoreHorizontal, Power, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, type ReactNode } from 'react';

export type AddonDetailProps = {
  logo: ReactNode;
  name: string;
  by: string;
  desc: string;
  installed: boolean;
  features: string[];
  configRows?: Array<{ label: string; node: ReactNode }>;
  notes?: ReactNode;
};

export function V2AddonDetail({
  logo,
  name,
  by,
  desc,
  installed,
  features,
  configRows = [],
  notes,
}: AddonDetailProps) {
  const t = useTranslations('v2_addons.detail');
  return (
    <>
      <section className="addon-hero">
        <div className="logo">{logo}</div>
        <div>
          <h2>{name}</h2>
          <div className="by">{by}</div>
        </div>
        <div className="actions">
          {installed ? (
            <>
              <button className="btn btn-secondary" type="button">
                <Settings size={16} strokeWidth={1.75} />
                {t('configure')}
              </button>
              <button className="btn btn-ghost" type="button">
                <Power size={16} strokeWidth={1.75} />
                {t('disable')}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" type="button">
              <Check size={16} strokeWidth={1.75} />
              {t('install')}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" type="button" aria-label={t('more')}>
            <MoreHorizontal size={14} strokeWidth={1.75} />
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('about')}</div>
          {installed ? (
            <span className="pill pill-success">
              <Check size={10} strokeWidth={2.5} /> {t('installed')}
            </span>
          ) : null}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
          {desc}
        </p>
        <ul className="feature-list">
          {features.map((f) => (
            <li key={f}>
              <Check size={14} strokeWidth={2} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {configRows.length > 0 ? (
        <Fragment key="config">
          <div className="spacer" />
          <section className="card">
            <div className="card-header">
              <div className="card-title">{t('configuration')}</div>
            </div>
            <div className="form-grid">
              {configRows.map((r) => (
                <Fragment key={r.label}>
                  <div className="form-label">{r.label}</div>
                  <div className="field">{r.node}</div>
                </Fragment>
              ))}
            </div>
          </section>
        </Fragment>
      ) : null}

      {notes ? (
        <Fragment key="notes">
          <div className="spacer" />
          <section className="card">
            <div className="card-header">
              <div className="card-title">{t('notes')}</div>
              <button type="button" className="btn btn-ghost btn-sm">
                {t('documentation')} <ExternalLink size={11} strokeWidth={1.75} />
              </button>
            </div>
            {notes}
          </section>
        </Fragment>
      ) : null}
    </>
  );
}
