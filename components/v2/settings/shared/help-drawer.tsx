'use client';

import { BookOpen, ExternalLink, MessageCircle, Search, Send, Video, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Q = { id: string; titleKey: string; catKey: string };

const QUESTIONS: Q[] = [
  { id: '1', titleKey: 'q1Title', catKey: 'q1Cat' },
  { id: '2', titleKey: 'q2Title', catKey: 'q2Cat' },
  { id: '3', titleKey: 'q3Title', catKey: 'q3Cat' },
  { id: '4', titleKey: 'q4Title', catKey: 'q4Cat' },
  { id: '5', titleKey: 'q5Title', catKey: 'q5Cat' },
  { id: '6', titleKey: 'q6Title', catKey: 'q6Cat' },
];

export function V2HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('v2_common.helpDrawer');
  if (!open) return null;
  return (
    <div
      className="v2-scrim"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      aria-modal
    >
      <div
        className="v2-drawer"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="head">
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t('title')}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="body">
          <div className="search-input" style={{ width: '100%' }}>
            <Search size={14} strokeWidth={1.75} />
            <input placeholder={t('searchPlaceholder')} />
          </div>

          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              fontWeight: 700,
              margin: '16px 0 8px',
            }}
          >
            {t('faq')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                style={{
                  display: 'flex',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: 'var(--text)',
                  border: '1px solid var(--divider)',
                  fontSize: 13,
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t(q.titleKey)}</div>
                  <div className="dim" style={{ fontSize: 11.5, marginTop: 2 }}>
                    {t(q.catKey)}
                  </div>
                </div>
                <ExternalLink size={12} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 12,
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12.5,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
              {t('stillStuck')}
            </div>
            {t('cantFind')}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              type="button"
            >
              <MessageCircle size={14} strokeWidth={1.75} />
              {t('chat')}
            </button>
            <button className="btn btn-secondary" type="button" aria-label={t('ariaVideoCall')}>
              <Video size={14} strokeWidth={1.75} />
            </button>
            <button className="btn btn-secondary" type="button" aria-label={t('ariaMail')}>
              <Send size={14} strokeWidth={1.75} />
            </button>
            <button className="btn btn-secondary" type="button" aria-label={t('ariaDoc')}>
              <BookOpen size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
