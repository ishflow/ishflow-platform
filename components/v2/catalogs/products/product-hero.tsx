import { Link } from '@/platform/i18n/navigation';
import { ArrowLeft, Plus, ScanLine, Settings, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';

export function ProductHero({
  sku,
  name,
  spec,
  stockBadge,
  barcode,
  size = 'lg',
  trailing,
  icon = <Smartphone size={44} strokeWidth={1.5} />,
}: {
  sku: string;
  name: string;
  spec: string;
  stockBadge?: string;
  barcode?: string;
  size?: 'lg' | 'sm';
  trailing?: ReactNode;
  icon?: ReactNode;
}) {
  const sm = size === 'sm';
  return (
    <section className="card">
      <div className="product-hero">
        <div className={`thumb${sm ? ' sm' : ''}`}>{icon}</div>
        <div className="info">
          <div className={`name${sm ? ' sm' : ''}`}>{name}</div>
          <div className={`meta-row${sm ? ' sm' : ''}`}>
            <span className="mono" style={{ color: 'var(--text)' }}>
              {sku}
            </span>
            <span>·</span>
            <span>{spec}</span>
            {stockBadge ? (
              <>
                <span>·</span>
                <span className="pill pill-success" style={{ fontSize: 11 }}>
                  {stockBadge}
                </span>
              </>
            ) : null}
          </div>
          {barcode ? (
            <div className="barcode">
              <ScanLine size={12} strokeWidth={1.75} />
              <span className="barcode-strip">
                <span /> <span className="w" /> <span /> <span /> <span className="w" />
                <span className="t" /> <span /> <span className="w" /> <span /> <span />
                <span className="w" /> <span /> <span className="t" /> <span />
                <span className="w" /> <span /> <span /> <span className="w" /> <span />
              </span>
              <span>{barcode}</span>
            </div>
          ) : null}
        </div>
        {trailing}
      </div>
    </section>
  );
}

export function ProductHeroBackToOverview({ href }: { href: string }) {
  return (
    <Link href={href} className="btn btn-secondary">
      <ArrowLeft size={14} strokeWidth={1.75} />
      Genel
    </Link>
  );
}

export function ProductHeroEditCta({ editHref }: { editHref: string }) {
  return (
    <>
      <Link href={editHref} className="btn btn-secondary">
        <Settings size={14} strokeWidth={1.75} />
        Düzenle
      </Link>
      <button type="button" className="btn btn-primary">
        <Plus size={14} strokeWidth={1.75} />
        Satışa ekle
      </button>
    </>
  );
}
