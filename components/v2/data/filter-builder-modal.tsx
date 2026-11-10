'use client';

import { ChevronDown, Copy, Filter, Plus, Trash2, X } from 'lucide-react';
import './data.css';

export type FilterRule = {
  id: string;
  field: string;
  op: string;
  value: string;
};

export type FilterGroup = {
  id: string;
  scopeLabel: string;
  logic: 'AND' | 'OR';
  logicHint: string;
  rules: FilterRule[];
  nested?: FilterGroup[];
};

export type V2FilterBuilderModalProps = {
  open: boolean;
  onClose: () => void;
  /** Pre-translated labels */
  labels: {
    title: string;
    subtitle: string;
    resultPrefix: string;
    resultSuffix: string;
    addCondition: string;
    addGroup: string;
    apply: string;
    cancel: string;
    save: string;
  };
  resultCount: string;
  root: FilterGroup;
};

function V2FilterGroupView({ group, nested }: { group: FilterGroup; nested?: boolean }) {
  return (
    <div className={`fb-group${nested ? ' nested' : ''}`}>
      <div className="fb-group-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label">{group.scopeLabel}</span>
          <div className="logic-toggle">
            <span className={`seg${group.logic === 'AND' ? ' is-active' : ''}`}>AND</span>
            <span className={`seg${group.logic === 'OR' ? ' is-active' : ''}`}>OR</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{group.logicHint}</span>
        </div>
        <div className="group-actions">
          <button type="button" aria-label="copy">
            <Copy size={12} strokeWidth={1.75} />
          </button>
          {nested ? (
            <button type="button" aria-label="delete">
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </div>
      {group.rules.map((r) => (
        <div key={r.id} className="fb-row">
          <div className="combobox">
            <button type="button" className="combobox-trigger">
              <span className="lbl">{r.field}</span>
              <ChevronDown size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className="combobox">
            <button type="button" className="combobox-trigger">
              <span className="lbl">{r.op}</span>
              <ChevronDown size={14} strokeWidth={1.75} />
            </button>
          </div>
          <input className="input" defaultValue={r.value} />
          <button type="button" className="del" aria-label="remove rule">
            <X size={12} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      {group.nested?.map((g) => (
        <V2FilterGroupView key={g.id} group={g} nested />
      ))}
    </div>
  );
}

export function V2FilterBuilderModal({
  open,
  onClose,
  labels,
  resultCount,
  root,
}: V2FilterBuilderModalProps) {
  if (!open) return null;
  return (
    <div className={`scrim is-open${open ? ' is-on' : ''}`}>
      <dialog open className="modal" style={{ maxWidth: 720, width: '92%' }} aria-modal="true">
        <div className="modal-head">
          <div className="glyph">
            <Filter size={16} strokeWidth={1.75} />
          </div>
          <div>
            <h3>{labels.title}</h3>
            <div className="sub">{labels.subtitle}</div>
          </div>
          <div className="right" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {labels.resultPrefix}{' '}
            <strong style={{ color: 'var(--accent)', fontSize: 14 }}>{resultCount}</strong>{' '}
            {labels.resultSuffix}
          </div>
        </div>
        <div className="modal-body">
          <V2FilterGroupView group={root} />
          <div className="fb-actions">
            <button type="button">
              <Plus size={12} strokeWidth={1.75} />
              {labels.addCondition}
            </button>
            <button type="button">
              <Plus size={12} strokeWidth={1.75} />
              {labels.addGroup}
            </button>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost btn-sm left" onClick={onClose}>
            {labels.cancel}
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            {labels.save}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {labels.apply}
          </button>
        </div>
      </dialog>
    </div>
  );
}
