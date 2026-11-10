'use client';

import { X } from 'lucide-react';

type Group = { title: string; rows: Array<{ label: string; keys: string[] }> };

const GROUPS: Group[] = [
  {
    title: 'Navigasyon',
    rows: [
      { label: 'Dashboard', keys: ['G', 'D'] },
      { label: 'Satış faturaları', keys: ['G', 'S'] },
      { label: 'Ürünler', keys: ['G', 'P'] },
      { label: 'Cari', keys: ['G', 'C'] },
      { label: 'Komut paleti', keys: ['⌘', 'K'] },
    ],
  },
  {
    title: 'Oluştur',
    rows: [
      { label: 'Yeni satış faturası', keys: ['N', 'I'] },
      { label: 'Yeni alış faturası', keys: ['N', 'B'] },
      { label: 'Yeni ürün', keys: ['N', 'P'] },
      { label: 'Yeni cari', keys: ['N', 'C'] },
    ],
  },
  {
    title: 'Liste',
    rows: [
      { label: 'Sonraki satır', keys: ['J'] },
      { label: 'Önceki satır', keys: ['K'] },
      { label: 'Aç', keys: ['Enter'] },
      { label: 'Çoklu seç', keys: ['X'] },
      { label: 'Filtre', keys: ['/'] },
    ],
  },
  {
    title: 'Belge',
    rows: [
      { label: 'Kaydet', keys: ['⌘', 'S'] },
      { label: 'Post et', keys: ['⌘', 'Shift', 'P'] },
      { label: 'Kopyala', keys: ['⌘', 'D'] },
      { label: 'Yeni satır', keys: ['Tab'] },
    ],
  },
];

export function V2ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        className="v2-modal-card"
        style={{ width: 640 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Klavye kısayolları</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="shortcuts-grid">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {g.title}
              </div>
              {g.rows.map((r) => (
                <div key={r.label} className="shortcut-row">
                  <span>{r.label}</span>
                  <span className="keys">
                    {r.keys.map((k, i) => (
                      <span key={`${r.label}-${i}`} className="kbd">
                        {k}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="v2-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
