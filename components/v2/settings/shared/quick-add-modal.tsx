'use client';

import { CreditCard, FileText, type LucideIcon, Package, Users, X } from 'lucide-react';
import Link from 'next/link';

type Item = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  href: string;
  kbd: string;
};

const ITEMS: Item[] = [
  {
    id: 'sales',
    icon: FileText,
    label: 'Satış faturası',
    desc: 'Yeni müşteri faturası — satır, kdv, post',
    href: '/documents/sales-invoice/new',
    kbd: 'N I',
  },
  {
    id: 'purchase',
    icon: FileText,
    label: 'Alış faturası',
    desc: 'Tedarikçiden gelen fatura',
    href: '/documents/sales-invoice/new',
    kbd: 'N B',
  },
  {
    id: 'product',
    icon: Package,
    label: 'Ürün',
    desc: 'Katalogu genişlet, SKU + fiyat',
    href: '/catalogs/products',
    kbd: 'N P',
  },
  {
    id: 'partner',
    icon: Users,
    label: 'Cari (müşteri / tedarikçi)',
    desc: 'VKN/INN + iletişim + finansal',
    href: '/catalogs/partners',
    kbd: 'N C',
  },
  {
    id: 'payment',
    icon: CreditCard,
    label: 'Tahsilat / Ödeme',
    desc: 'Manuel tahsilat veya ödeme belgesi',
    href: '/documents/sales-invoice/new',
    kbd: 'N M',
  },
];

export function V2QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="v2-scrim"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      aria-modal
    >
      <div
        className="v2-modal-card"
        style={{ width: 460 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Hızlı ekle</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="quick-add-list">
          {ITEMS.map((i) => {
            const Icon = i.icon;
            return (
              <Link key={i.id} href={i.href} className="quick-add-item" onClick={onClose}>
                <div className="ico">
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label">{i.label}</div>
                  <div className="desc">{i.desc}</div>
                </div>
                <span className="kbd" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {i.kbd}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
