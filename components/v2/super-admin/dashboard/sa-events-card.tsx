import { ExternalLink } from 'lucide-react';

export type SaEventTag = 'up' | 'down' | 'info' | 'warn';

export type SaEvent = {
  time: string;
  /** Bold subject (e.g. "Sample Trading"). */
  subject: string;
  /** Dimmed body after the subject (e.g. "— Pro plan upgrade completed ($49/mo)"). */
  detail: string;
  tag: SaEventTag;
  tagLabel: string;
};

export type SaEventsCardProps = {
  title: string;
  linkHref: string;
  linkLabel: string;
  events: SaEvent[];
};

/**
 * Operator-console system events card.
 *
 * Same shape as the V0.1 invoice-list card-header pattern, adapted for the
 * sa-dashboard "Son sistem olayları" block. `.ev-list`, `.ev-row`, `.ev-time`,
 * `.ev-body`, `.ev-tag` classes are NOT in v2-globals.css (they ship inline
 * in the sa-dashboard mockup). They're inlined here via `style` so we don't
 * touch stream-A CSS.
 */
export function SaEventsCard({ title, linkHref, linkLabel, events }: SaEventsCardProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <a className="card-link" href={linkHref}>
          {linkLabel}
          <ExternalLink size={14} strokeWidth={1.75} />
        </a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => (
          <div
            key={`${ev.time}-${ev.subject}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr auto',
              gap: 12,
              padding: '10px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11.5,
                color: 'var(--text-muted)',
              }}
            >
              {ev.time}
            </span>
            <div style={{ fontSize: 13 }}>
              <b style={{ fontWeight: 600 }}>{ev.subject}</b>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{ev.detail}</span>
            </div>
            <SaEventTagPill tag={ev.tag} label={ev.tagLabel} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SaEventTagPill({ tag, label }: { tag: SaEventTag; label: string }) {
  const bg =
    tag === 'up'
      ? 'var(--success-soft)'
      : tag === 'info'
        ? 'var(--info-soft)'
        : tag === 'warn'
          ? 'var(--warning-soft)'
          : 'var(--danger-soft)';
  const color =
    tag === 'up'
      ? 'var(--success-text)'
      : tag === 'info'
        ? 'var(--info-text)'
        : tag === 'warn'
          ? 'var(--warning-text)'
          : 'var(--danger-text)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}
