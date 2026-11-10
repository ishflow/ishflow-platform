import { Clock, X } from 'lucide-react';
import Link from 'next/link';

export function V2TrialExpiringBanner({
  days,
  onDismiss,
}: {
  days: number;
  onDismiss?: () => void;
}) {
  return (
    <div className="v2-banner trial" aria-live="assertive">
      <Clock size={16} strokeWidth={1.75} />
      <span>
        Deneme süren <b>{days} gün</b> içinde bitiyor. Plan seçmeden faturalandırma başlamaz.
      </span>
      <Link href="/settings/billing" className="btn btn-primary btn-sm cta">
        Yükselt
      </Link>
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
