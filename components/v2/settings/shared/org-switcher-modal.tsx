'use client';

import { Plus, X } from 'lucide-react';
import Link from 'next/link';

type Org = { id: string; name: string; role: string; initials: string; active?: boolean };

const ORGS: Org[] = [
  { id: '1', name: 'Sample Trading LLC', role: 'Sahip', initials: 'ST', active: true },
  { id: '2', name: 'Acme Distribution', role: 'Yönetici', initials: 'AD' },
  { id: '3', name: 'Beta Wholesale', role: 'Bakeeper', initials: 'BW' },
];

export function V2OrgSwitcherModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        style={{ width: 440 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Organizasyon değiştir</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="org-list">
          {ORGS.map((o) => (
            <button
              type="button"
              key={o.id}
              className={`org-item${o.active ? ' is-active' : ''}`}
              onClick={onClose}
            >
              <div className="avatar">{o.initials}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.name}</div>
                <div className="dim" style={{ fontSize: 11.5 }}>
                  {o.role}
                </div>
              </div>
            </button>
          ))}
        </div>
        <Link
          href="/onboarding/welcome"
          className="btn btn-secondary"
          style={{ justifyContent: 'center' }}
          onClick={onClose}
        >
          <Plus size={14} strokeWidth={1.75} />
          Yeni çalışma alanı oluştur
        </Link>
      </div>
    </div>
  );
}
