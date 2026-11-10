'use client';

import { CheckCheck, Settings, X } from 'lucide-react';
import Link from 'next/link';

type N = {
  id: string;
  title: string;
  body: string;
  when: string;
  unread: boolean;
};

const ROWS: N[] = [
  {
    id: '1',
    title: 'Yeni fatura — INV-2026-1402',
    body: 'Murat: "lütfen onayla"',
    when: '5 dk',
    unread: true,
  },
  {
    id: '2',
    title: 'Tahsilat geldi — ₺14.200',
    body: 'TR Bank → Sample Trading',
    when: '42 dk',
    unread: true,
  },
  {
    id: '3',
    title: 'Stok kritik · Türk kahvesi 250g',
    body: '8 koli kaldı',
    when: '2 sa',
    unread: true,
  },
  {
    id: '4',
    title: 'Webhook hata — make.com',
    body: '502 Bad Gateway · 14 fail',
    when: '4 sa',
    unread: false,
  },
  { id: '5', title: 'Dönem kapatma tamamlandı', body: 'Nisan 2026', when: 'Dün', unread: false },
];

export function V2NotificationsInboxModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
        style={{ width: 420, padding: 0, alignSelf: 'flex-start', marginTop: 60, marginRight: 16 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Bildirimler</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Hepsini okundu işaretle"
            >
              <CheckCheck size={14} strokeWidth={1.75} />
            </button>
            <Link
              href="/settings/notifications/preferences"
              className="btn btn-ghost btn-sm"
              aria-label="Tercihler"
            >
              <Settings size={14} strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Kapat"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 480, overflow: 'auto' }}>
          {ROWS.map((n) => (
            <div key={n.id} className={`notif-row${n.unread ? ' unread' : ''}`}>
              <div className="ico" />
              <div className="body">
                <div className="head">{n.title}</div>
                <div className="preview">{n.body}</div>
              </div>
              <span className="when">{n.when}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: 10,
            borderTop: '1px solid var(--divider)',
            textAlign: 'center',
          }}
        >
          <Link
            href="/settings/notifications"
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onClose}
          >
            Tümünü gör
          </Link>
        </div>
      </div>
    </div>
  );
}
