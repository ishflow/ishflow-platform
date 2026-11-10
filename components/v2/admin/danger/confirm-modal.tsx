'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type V2DangerConfirmModalProps = {
  open?: boolean;
  onClose?: () => void;
  labels: {
    title: string;
    body: ReactNode;
    confirmTypePh: string;
    confirmHint: string;
    cancel: string;
    confirm: string;
  };
};

export function V2DangerConfirmModal(p: V2DangerConfirmModalProps) {
  if (p.open === false) return null;
  return (
    <div className="scrim is-open">
      <div className="modal" style={{ maxWidth: 460, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <AlertTriangle size={16} strokeWidth={1.75} style={{ color: 'var(--danger-text)' }} />
          <h3 style={{ margin: 0, color: 'var(--danger-text)' }}>{p.labels.title}</h3>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {p.labels.body}
        </p>

        <div className="form-grp">
          <input className="input" type="text" placeholder={p.labels.confirmTypePh} />
          <div className="hint">{p.labels.confirmHint}</div>
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-ghost" onClick={p.onClose}>
            {p.labels.cancel}
          </button>
          <button type="button" className="btn btn-danger">
            <Trash2 size={14} strokeWidth={1.75} />
            {p.labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
