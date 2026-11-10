'use client';

import { AlertTriangle, Crown } from 'lucide-react';

export type TransferOwnershipModalProps = {
  open?: boolean;
  onClose?: () => void;
  labels: {
    title: string;
    intro: (parts: { workspace: React.ReactNode; adminRole: React.ReactNode }) => React.ReactNode;
    fieldLabel: string;
    fieldPh: string;
    suggestNote: string;
    warnTitle: string;
    warnBody: React.ReactNode;
    ack1: React.ReactNode;
    ack2: React.ReactNode;
    cancel: string;
    confirm: string;
  };
  suggestion?: {
    initials: string;
    name: string;
    email: string;
    roleTag: string;
  };
};

export function V2TransferOwnershipModal(p: TransferOwnershipModalProps) {
  if (p.open === false) return null;
  return (
    <div className="scrim is-open">
      <div className="modal" style={{ maxWidth: 520, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Crown size={16} strokeWidth={1.75} style={{ color: 'var(--danger-text)' }} />
          <h3 style={{ margin: 0, color: 'var(--danger-text)' }}>{p.labels.title}</h3>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          {p.labels.intro({
            workspace: <b>Sample Trading LLC</b>,
            adminRole: <b>{/* admin label injected by caller via intro */}</b>,
          })}
        </p>

        <div className="form-grp">
          <label htmlFor="new-owner" className="lbl">
            {p.labels.fieldLabel}
          </label>
          <input
            id="new-owner"
            className="input"
            type="text"
            placeholder={p.labels.fieldPh}
            defaultValue="irem@sample"
          />
          {p.suggestion ? (
            <div className="suggest">
              <div className="av">{p.suggestion.initials}</div>
              <div className="who">
                <div className="nm">{p.suggestion.name}</div>
                <div className="em">{p.suggestion.email}</div>
              </div>
              <span className="role-tag">{p.suggestion.roleTag}</span>
            </div>
          ) : null}
          <div className="hint">{p.labels.suggestNote}</div>
        </div>

        <div className="warn-block">
          <div className="ttl">
            <AlertTriangle size={14} strokeWidth={1.75} />
            {p.labels.warnTitle}
          </div>
          {p.labels.warnBody}
        </div>

        <label className="chk-row">
          <input type="checkbox" />
          <div className="body">{p.labels.ack1}</div>
        </label>

        <label className="chk-row">
          <input type="checkbox" />
          <div className="body">{p.labels.ack2}</div>
        </label>

        <div className="actions" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-ghost" onClick={p.onClose}>
            {p.labels.cancel}
          </button>
          <button type="button" className="btn btn-danger">
            <Crown size={14} strokeWidth={1.75} />
            {p.labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
