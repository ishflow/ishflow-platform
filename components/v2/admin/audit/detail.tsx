'use client';

import { Link } from '@/platform/i18n/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Link as LinkIcon,
  Package,
  User,
} from 'lucide-react';
import { useState } from 'react';

export type DiffLine = { ln: number; kind: 'ctx' | 'add' | 'del'; text: string };

type DiffTab = 'sideBySide' | 'unified' | 'raw';

export type AuditDetailProps = {
  labels: {
    summary: {
      id: string;
      ts: string;
      action: string;
      targetType: string;
      target: string;
      user: string;
      tenant: string;
      exportJson: string;
      copyEvent: string;
      copied: string;
    };
    diffTitle: string;
    diffTabSideBySide: string;
    diffTabUnified: string;
    diffTabRaw: string;
    diffBefore: string;
    diffAfter: string;
    relatedTitle: string;
    relatedItems: {
      changedRecord: string;
      actor: string;
      sameUserRecent: string;
    };
  };
  summary: {
    id: string;
    ts: string;
    action: string;
    targetType: string;
    targetText: string;
    targetHref: string;
    user: string;
    userEmail: string;
    tenant: string;
  };
  diffBefore: DiffLine[];
  diffAfter: DiffLine[];
  // Raw payloads for the "Raw" tab + JSON export.
  before: unknown;
  after: unknown;
  // Audit-list links for the related-records cards.
  changedRecordHref: string;
  actorHref: string;
  sameUserRecentHref: string;
};

function renderLines(lines: DiffLine[]) {
  return lines.map((l) => (
    <div key={l.ln} className={`diff-line ${l.kind}`}>
      <span className="ln">{l.ln}</span>
      {l.text}
    </div>
  ));
}

// Interleave the two panes into a single column: ctx lines once, then any
// del (before) followed by its add (after). Mirrors a unified `git diff`.
function unifiedLines(before: DiffLine[], after: DiffLine[]): DiffLine[] {
  const out: DiffLine[] = [];
  let bi = 0;
  let ai = 0;
  let ln = 1;
  while (bi < before.length || ai < after.length) {
    const b = before[bi];
    const a = after[ai];
    if (b && b.kind === 'ctx' && a && a.kind === 'ctx') {
      out.push({ ln: ln++, kind: 'ctx', text: b.text });
      bi++;
      ai++;
      continue;
    }
    if (b && b.kind === 'del') {
      out.push({ ln: ln++, kind: 'del', text: b.text });
      bi++;
      continue;
    }
    if (a && a.kind === 'add') {
      out.push({ ln: ln++, kind: 'add', text: a.text });
      ai++;
      continue;
    }
    // Fallthrough for any leftover ctx imbalance.
    if (b) {
      out.push({ ln: ln++, kind: b.kind, text: b.text });
      bi++;
    } else if (a) {
      out.push({ ln: ln++, kind: a.kind, text: a.text });
      ai++;
    }
  }
  return out;
}

export function V2AuditDetail(p: AuditDetailProps) {
  const [tab, setTab] = useState<DiffTab>('sideBySide');
  const [copied, setCopied] = useState(false);

  function exportJson() {
    const payload = JSON.stringify({ before: p.before, after: p.after }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${p.summary.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyPermalink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context) — silently ignore.
    }
  }

  const rawText = JSON.stringify({ before: p.before, after: p.after }, null, 2);
  // Reset the native <button> chrome so the .diff-tab class fully controls look.
  const tabBtnStyle: React.CSSProperties = { background: 'transparent', font: 'inherit' };
  const relatedCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    textDecoration: 'none',
    background: 'transparent',
    font: 'inherit',
    textAlign: 'left',
  };

  return (
    <div className="audit-grid">
      <aside className="card audit-summary">
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.id}</span>
          <span className="val mono">{p.summary.id}</span>
        </div>
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.ts}</span>
          <span className="val mono">{p.summary.ts}</span>
        </div>
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.action}</span>
          <span className="val">{p.summary.action}</span>
        </div>
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.targetType}</span>
          <span className="val">{p.summary.targetType}</span>
        </div>
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.target}</span>
          <span className="val mono">
            <Link href={p.summary.targetHref} style={{ color: 'var(--text)' }}>
              {p.summary.targetText}
            </Link>
          </span>
        </div>
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.user}</span>
          <span className="val">
            {p.summary.user} · {p.summary.userEmail}
          </span>
        </div>
        <div className="summary-row">
          <span className="lbl">{p.labels.summary.tenant}</span>
          <span className="val mono">{p.summary.tenant}</span>
        </div>

        <div className="spacer" />

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={exportJson}
        >
          <Download size={14} strokeWidth={1.75} />
          {p.labels.summary.exportJson}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          onClick={copyPermalink}
        >
          {copied ? (
            <Check size={14} strokeWidth={1.75} />
          ) : (
            <LinkIcon size={14} strokeWidth={1.75} />
          )}
          {copied ? p.labels.summary.copied : p.labels.summary.copyEvent}
        </button>
      </aside>

      <section>
        <div className="card-header" style={{ marginBottom: 10, border: 0 }}>
          <div className="card-title">{p.labels.diffTitle}</div>
          <div className="diff-tabs">
            <button
              type="button"
              className={`diff-tab${tab === 'sideBySide' ? ' is-active' : ''}`}
              style={tabBtnStyle}
              onClick={() => setTab('sideBySide')}
            >
              {p.labels.diffTabSideBySide}
            </button>
            <button
              type="button"
              className={`diff-tab${tab === 'unified' ? ' is-active' : ''}`}
              style={tabBtnStyle}
              onClick={() => setTab('unified')}
            >
              {p.labels.diffTabUnified}
            </button>
            <button
              type="button"
              className={`diff-tab${tab === 'raw' ? ' is-active' : ''}`}
              style={tabBtnStyle}
              onClick={() => setTab('raw')}
            >
              {p.labels.diffTabRaw}
            </button>
          </div>
        </div>

        {tab === 'sideBySide' ? (
          <div className="diff-view">
            <div className="diff-pane">
              <div className="diff-head before">
                <ArrowLeft size={12} strokeWidth={2} />
                {p.labels.diffBefore}
              </div>
              <div className="diff-body">{renderLines(p.diffBefore)}</div>
            </div>
            <div className="diff-pane">
              <div className="diff-head after">
                <ArrowRight size={12} strokeWidth={2} />
                {p.labels.diffAfter}
              </div>
              <div className="diff-body">{renderLines(p.diffAfter)}</div>
            </div>
          </div>
        ) : tab === 'unified' ? (
          <div className="diff-view">
            <div className="diff-pane" style={{ gridColumn: '1 / -1' }}>
              <div className="diff-body">
                {renderLines(unifiedLines(p.diffBefore, p.diffAfter))}
              </div>
            </div>
          </div>
        ) : (
          <div className="diff-view">
            <div className="diff-pane" style={{ gridColumn: '1 / -1' }}>
              <pre
                className="mono"
                style={{
                  margin: 0,
                  padding: 12,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--text)',
                }}
              >
                {rawText}
              </pre>
            </div>
          </div>
        )}

        <div className="spacer" />

        <section className="card">
          <div className="card-header">
            <div className="card-title">{p.labels.relatedTitle}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            <Link href={p.changedRecordHref} style={relatedCardStyle}>
              <Package size={14} strokeWidth={1.75} />
              <div style={{ flex: 1 }}>
                <strong>{p.summary.targetText}</strong>
                <div className="dim" style={{ fontSize: 11.5 }}>
                  {p.labels.relatedItems.changedRecord}
                </div>
              </div>
              <span className="dim">→</span>
            </Link>
            <Link href={p.actorHref} style={relatedCardStyle}>
              <User size={14} strokeWidth={1.75} />
              <div style={{ flex: 1 }}>
                <strong>{p.summary.userEmail}</strong>
                <div className="dim" style={{ fontSize: 11.5 }}>
                  {p.labels.relatedItems.actor}
                </div>
              </div>
              <span className="dim">→</span>
            </Link>
            <Link href={p.sameUserRecentHref} style={relatedCardStyle}>
              <User size={14} strokeWidth={1.75} />
              <div style={{ flex: 1 }}>
                <strong>{p.labels.relatedItems.sameUserRecent}</strong>
              </div>
              <span className="dim">→</span>
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
