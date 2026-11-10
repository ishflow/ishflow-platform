import { AlertOctagon } from 'lucide-react';
import Link from 'next/link';

export type V2BannerOwnerlessProps = {
  labels: {
    msg: string;
    cta: string;
  };
  ctaHref?: string;
};

export function V2BannerOwnerless(p: V2BannerOwnerlessProps) {
  return (
    <div className="banner-ownerless">
      <AlertOctagon size={18} strokeWidth={1.75} />
      <div className="msg">{p.labels.msg}</div>
      <Link
        href={p.ctaHref ?? '/admin/members'}
        className="btn btn-secondary btn-sm"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        {p.labels.cta}
      </Link>
    </div>
  );
}
