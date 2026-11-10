'use client';

import { X } from 'lucide-react';

const LOCALES = [
  { code: 'ru', name: 'Русский', flag: 'RU' },
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'tr', name: 'Türkçe', flag: 'TR' },
  { code: 'uz', name: "O'zbek", flag: 'UZ' },
  { code: 'ky', name: 'Кыргызча', flag: 'KY' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'fr', name: 'Français', flag: 'FR' },
  { code: 'zh', name: '中文', flag: 'ZH' },
];

export function V2LocaleSwitcherModal({
  open,
  onClose,
  current,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  onSelect: (code: string) => void;
}) {
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
        style={{ width: 420 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Dil değiştir</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="locale-list">
          {LOCALES.map((l) => (
            <button
              type="button"
              key={l.code}
              className={`locale-item${l.code === current ? ' is-active' : ''}`}
              onClick={() => {
                onSelect(l.code);
                onClose();
              }}
            >
              <div className="flag">{l.flag}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.name}</div>
                <div className="dim" style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>
                  {l.code}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
