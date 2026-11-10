'use client';

import { Bookmark } from 'lucide-react';
import './data.css';

export type V2SaveViewModalProps = {
  open: boolean;
  onClose: () => void;
  labels: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    scopeLabel: string;
    scopePrivate: string;
    scopeShared: string;
    pinLabel: string;
    cancel: string;
    save: string;
  };
};

export function V2SaveViewModal({ open, onClose, labels }: V2SaveViewModalProps) {
  if (!open) return null;
  return (
    <div className="scrim is-open is-on">
      <dialog open className="modal" style={{ maxWidth: 460, width: '92%' }} aria-modal="true">
        <div className="modal-head">
          <div className="glyph">
            <Bookmark size={16} strokeWidth={1.75} />
          </div>
          <div>
            <h3>{labels.title}</h3>
            <div className="sub">{labels.subtitle}</div>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {labels.nameLabel}
              <input className="input" placeholder={labels.namePlaceholder} />
            </label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <span>{labels.scopeLabel}</span>
              <div className="chip-row">
                <button type="button" className="chip is-active">
                  {labels.scopePrivate}
                </button>
                <button type="button" className="chip">
                  {labels.scopeShared}
                </button>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <input type="checkbox" />
              {labels.pinLabel}
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {labels.cancel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {labels.save}
          </button>
        </div>
      </dialog>
    </div>
  );
}
