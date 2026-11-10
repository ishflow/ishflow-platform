import { Link } from '@/platform/i18n/navigation';
import { BellOff, Settings } from 'lucide-react';

export type NotificationsInboxLabels = {
  emptyTitle: string;
  emptyNote: string;
  preferences: string;
};

/**
 * In-app notification inbox. There is no notification feed table yet, so this
 * is an honest empty state rather than a mock list: operational alerts go out
 * by email per the tenant's preferences, with a link to manage them.
 */
export function V2NotificationsInbox({ labels }: { labels: NotificationsInboxLabels }) {
  return (
    <section className="card">
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <BellOff size={28} strokeWidth={1.5} />
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
          {labels.emptyTitle}
        </div>
        <div style={{ fontSize: 13, maxWidth: 420 }}>{labels.emptyNote}</div>
        <Link
          href="/settings/notifications/preferences"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 4 }}
        >
          <Settings size={14} strokeWidth={1.75} />
          {labels.preferences}
        </Link>
      </div>
    </section>
  );
}
