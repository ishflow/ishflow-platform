'use client';

import type { ApiTokenRow } from '@/app/[locale]/(app)/settings/api/tokens/actions';
import { revokeApiTokenAction } from '@/app/[locale]/(app)/settings/api/tokens/actions';
import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from '@/app/[locale]/(app)/settings/sessions/actions';
import type { SessionRow } from '@/app/[locale]/(app)/settings/sessions/page';
import { Laptop, LogOut, RefreshCw, Smartphone, Terminal } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function V2ActiveSessions({
  sessions,
  tokens,
}: {
  sessions: SessionRow[];
  tokens: ApiTokenRow[];
}) {
  const t = useTranslations('v2_settings.sessions');
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const browser = sessions.filter((s) => !s.isMobile);
  const mobile = sessions.filter((s) => s.isMobile);

  const fmt = (ms: number | null) =>
    ms ? format.dateTime(new Date(ms), { dateStyle: 'medium', timeStyle: 'short' }) : t('never');
  const fmtIso = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: 'medium' }) : t('never');

  function revoke(id: string) {
    if (!window.confirm(t('revokeConfirm'))) return;
    startTransition(async () => {
      await revokeSessionAction(id);
      router.refresh();
    });
  }

  function revokeOthers() {
    if (!window.confirm(t('revokeConfirm'))) return;
    startTransition(async () => {
      await revokeOtherSessionsAction();
      router.refresh();
    });
  }

  function revokeToken(id: string) {
    startTransition(async () => {
      await revokeApiTokenAction(id);
      router.refresh();
    });
  }

  function SessionCard({ s }: { s: SessionRow }) {
    const title = s.device || (s.isMobile ? t('mobileSession') : t('browserSession'));
    return (
      <div className={`ses-card${s.isCurrent ? ' is-current' : ''}`}>
        <div className="icon">
          {s.isMobile ? (
            <Smartphone size={18} strokeWidth={1.75} />
          ) : (
            <Laptop size={18} strokeWidth={1.75} />
          )}
        </div>
        <div className="meta">
          <div className="title-row">
            <div className="title">{title}</div>
            {s.isCurrent ? <span className="pill pill-success">{t('thisDevice')}</span> : null}
          </div>
          <div className="stats">
            {s.ip ? (
              <span>
                {t('col.ip')}: <b>{s.ip}</b>
              </span>
            ) : null}
            {s.location ? (
              <span>
                {t('col.location')}: <b>{s.location}</b>
              </span>
            ) : null}
            <span>
              {t('col.lastActivity')}: <b>{fmt(s.lastActiveAt)}</b>
            </span>
            <span>
              {t('col.started')}: <b>{fmt(s.createdAt)}</b>
            </span>
          </div>
        </div>
        <div className="right">
          {s.isCurrent ? (
            <span style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 600 }}>
              ● {t('statusActive')}
            </span>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={pending}
              onClick={() => revoke(s.id)}
            >
              <LogOut size={14} strokeWidth={1.75} />
              {t('revoke')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="action-bar">
        <div className="left">
          <span style={{ fontSize: '13.5px', color: 'var(--text)' }}>
            <b>{t('summary', { count: sessions.length })}</b>
          </span>
        </div>
        <div className="right">
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => router.refresh()}
            disabled={pending}
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            {t('refresh')}
          </button>
          <button
            className="btn btn-danger btn-sm"
            type="button"
            onClick={revokeOthers}
            disabled={pending || sessions.length < 2}
          >
            <LogOut size={14} strokeWidth={1.75} />
            {t('terminateOthers')}
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('groups.browser')}</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{browser.length}</span>
        </div>
        {browser.length === 0 ? (
          <p className="dim" style={{ padding: '8px 0' }}>
            {t('empty')}
          </p>
        ) : (
          browser.map((s) => <SessionCard key={s.id} s={s} />)
        )}
      </section>

      {mobile.length > 0 ? (
        <>
          <div className="spacer" />
          <section className="card">
            <div className="card-header">
              <div className="card-title">{t('groups.mobile')}</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{mobile.length}</span>
            </div>
            {mobile.map((s) => (
              <SessionCard key={s.id} s={s} />
            ))}
          </section>
        </>
      ) : null}

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('groups.cli')}</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tokens.length}</span>
        </div>
        {tokens.length === 0 ? (
          <p className="dim" style={{ padding: '8px 0' }}>
            {t('cliEmpty')}
          </p>
        ) : (
          tokens.map((tok) => (
            <div className="ses-card" key={tok.id}>
              <div className="icon">
                <Terminal size={18} strokeWidth={1.75} />
              </div>
              <div className="meta">
                <div className="title-row">
                  <div className="title">{tok.name}</div>
                  <span className="pill pill-info mono">{tok.keyPrefix}••••</span>
                </div>
                <div className="stats">
                  <span>
                    {t('col.started')}: <b>{fmtIso(tok.createdAt)}</b>
                  </span>
                  <span>
                    {t('lastUsed')}: <b>{fmtIso(tok.lastUsedAt)}</b>
                  </span>
                </div>
              </div>
              <div className="right">
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={pending}
                  onClick={() => revokeToken(tok.id)}
                >
                  <LogOut size={14} strokeWidth={1.75} />
                  {t('revoke')}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title" style={{ color: 'var(--danger-text)' }}>
            {t('dangerTitle')}
          </div>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">{t('terminateOthers')}</div>
            <div className="desc">{t('dangerDesc')}</div>
          </div>
          <button
            className="btn btn-danger"
            type="button"
            onClick={revokeOthers}
            disabled={pending || sessions.length < 2}
          >
            <LogOut size={16} strokeWidth={1.75} />
            {t('terminateOthers')}
          </button>
        </div>
      </section>
    </>
  );
}
