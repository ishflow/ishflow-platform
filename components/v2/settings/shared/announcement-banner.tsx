import { Megaphone, X } from 'lucide-react';
import Link from 'next/link';

export function V2AnnouncementBanner({
  title,
  cta,
  href,
  onDismiss,
}: {
  title: string;
  cta?: string;
  href?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="v2-banner announcement" aria-live="polite">
      <Megaphone size={16} strokeWidth={1.75} />
      <span>{title}</span>
      {cta && href ? (
        <Link href={href} className="btn btn-secondary btn-sm cta">
          {cta}
        </Link>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onDismiss}
          aria-label="Banner'ı kapat"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}
