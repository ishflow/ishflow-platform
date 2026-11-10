'use client';

import { Check, ExternalLink, Settings, X } from 'lucide-react';
import Link from 'next/link';

const INSTALLED = [
  { id: '1c', name: '1C Migration', desc: '1C verileri import', state: 'idle' as const },
  {
    id: 'bank-import',
    name: 'Bank Import',
    desc: '14 May 2026 son içe aktarma',
    state: 'idle' as const,
  },
  { id: 'stripe', name: 'Stripe Payments', desc: 'Bağlı · ₺214,300 bu ay', state: 'idle' as const },
  { id: 'ai-ocr', name: 'AI OCR', desc: '92% doğruluk · 47 sayfa', state: 'beta' as const },
];

export function V2AddonsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="v2-scrim"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      aria-modal
      style={{ justifyItems: 'end', alignItems: 'stretch' }}
    >
      <div
        className="v2-drawer"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="head">
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Eklentiler</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="body">
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Yüklü ({INSTALLED.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {INSTALLED.map((a) => (
              <Link
                key={a.id}
                href={`/addons/${a.id}`}
                className="quick-add-item"
                onClick={onClose}
              >
                <div className="ico" style={{ background: 'var(--success-soft)' }}>
                  <Check size={14} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label">{a.name}</div>
                  <div className="desc">{a.desc}</div>
                </div>
                {a.state === 'beta' ? (
                  <span className="pill pill-info">beta</span>
                ) : (
                  <Settings size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                )}
              </Link>
            ))}
          </div>

          <Link
            href="/addons"
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
            onClick={onClose}
          >
            <ExternalLink size={14} strokeWidth={1.75} />
            Mağazaya git
          </Link>
        </div>
      </div>
    </div>
  );
}
