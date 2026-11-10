'use client';

import {
  createApiTokenAction,
  revokeApiTokenAction,
} from '@/app/[locale]/(app)/settings/api/tokens/actions';
import type { ApiTokenRow } from '@/app/[locale]/(app)/settings/api/tokens/actions';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function V2ApiTokens({
  initialTokens,
  apiBaseUrl,
}: {
  initialTokens: ApiTokenRow[];
  apiBaseUrl: string;
}) {
  const t = useTranslations('v2_settings.apiTokensPage');
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fmtDate = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });

  function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    startTransition(async () => {
      const res = await createApiTokenAction({ name: name.trim(), scope });
      if (!res.ok) {
        setError(
          res.code === 'taken'
            ? t('nameTaken')
            : res.code === 'invalid'
              ? t('nameRequired')
              : t('genericError'),
        );
        return;
      }
      setCreatedKey(res.fullKey);
      setName('');
      setScope('read');
      router.refresh();
    });
  }

  function handleRevoke(id: string) {
    if (!window.confirm(t('revokeConfirm'))) return;
    startTransition(async () => {
      await revokeApiTokenAction(id);
      setTokens((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    });
  }

  async function copyKey() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  }

  return (
    <>
      {createdKey ? (
        <section className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="card-header">
            <div className="card-title">{t('createdTitle')}</div>
          </div>
          <p className="dim" style={{ marginBottom: 12 }}>
            {t('createdHint')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code
              className="mono"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--surface-2)',
                borderRadius: 8,
                wordBreak: 'break-all',
              }}
            >
              {createdKey}
            </code>
            <button className="btn btn-ghost btn-sm" type="button" onClick={copyKey}>
              {copied ? (
                <Check size={14} strokeWidth={1.75} />
              ) : (
                <Copy size={14} strokeWidth={1.75} />
              )}
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <div className="action-bar" style={{ marginTop: 16 }}>
            <div className="left">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setCreatedKey(null);
                  setCopied(false);
                }}
              >
                {t('done')}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('listTitle')}</div>
        </div>
        {tokens.length === 0 ? (
          <p className="dim" style={{ padding: '8px 0' }}>
            {t('empty')}
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>{t('colName')}</th>
                <th>{t('colToken')}</th>
                <th>{t('colScope')}</th>
                <th>{t('colCreated')}</th>
                <th>{t('colLastUsed')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tokens.map((tok) => (
                <tr key={tok.id}>
                  <td>
                    <b>{tok.name}</b>
                  </td>
                  <td className="mono">{tok.keyPrefix}••••</td>
                  <td className="dim">
                    {tok.scope === 'write' ? t('scopeWrite') : t('scopeRead')}
                  </td>
                  <td>{fmtDate(tok.createdAt)}</td>
                  <td>{tok.lastUsedAt ? fmtDate(tok.lastUsedAt) : t('never')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      aria-label={t('revoke')}
                      disabled={isPending}
                      onClick={() => handleRevoke(tok.id)}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('createTitle')}</div>
        </div>
        <input
          className="input"
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 18 }}
        />
        <div className="form-grid">
          <div className="form-label">{t('scopeFieldLabel')}</div>
          <div className="field">
            <div
              className="chip-row"
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <button
                type="button"
                className={scope === 'read' ? 'chip is-active' : 'chip'}
                onClick={() => setScope('read')}
              >
                {t('scopeRead')}
              </button>
              <button
                type="button"
                className={scope === 'write' ? 'chip is-active' : 'chip'}
                onClick={() => setScope('write')}
              >
                {t('scopeWrite')}
              </button>
            </div>
          </div>
        </div>
        {error ? <p style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p> : null}
        <div className="action-bar" style={{ marginTop: 18 }}>
          <div className="left">
            <button
              className="btn btn-primary"
              type="button"
              disabled={!name.trim() || isPending}
              onClick={handleCreate}
            >
              <Plus size={16} strokeWidth={1.75} />
              {isPending ? t('creating') : t('create')}
            </button>
          </div>
          <div className="right dim">
            <Check size={14} strokeWidth={1.75} /> {t('onceHint')}
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">
            <KeyRound
              size={15}
              strokeWidth={1.75}
              style={{ marginRight: 6, verticalAlign: '-2px' }}
            />
            {t('connectTitle')}
          </div>
        </div>
        <p className="dim" style={{ marginBottom: 10 }}>
          {t('connectDesc')}
        </p>
        <code
          className="mono"
          style={{
            display: 'block',
            padding: '10px 12px',
            background: 'var(--surface-2)',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          Authorization: Bearer 1ca_live_…&#10;{apiBaseUrl}
        </code>
        <p className="dim">{t('connectTest')}</p>
      </section>
    </>
  );
}
