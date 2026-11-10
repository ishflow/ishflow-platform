'use client';

import { Calendar, FileText, Filter, Folder, Package, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

type FilterKind = 'all' | 'documents' | 'partners' | 'products';
type Row = {
  href: string;
  av: ReactNode;
  title: ReactNode;
  meta: string;
  right: string;
};

const Q = 'elektronik';

const DOCS: Row[] = [
  {
    href: '/documents/sales-invoice',
    av: <FileText size={14} strokeWidth={1.75} />,
    title: (
      <>
        INVOICE-000012 · Vatan Bilgisayar — <mark>Elektronik</mark> tedarik faturası
      </>
    ),
    meta: 'Alış faturası · Onaylı · 16 May 2026',
    right: '$52,140.00',
  },
  {
    href: '/documents/sales-invoice',
    av: <FileText size={14} strokeWidth={1.75} />,
    title: (
      <>
        INVOICE-000010 · Vatan <mark>Elektronik</mark> A.Ş.
      </>
    ),
    meta: 'Alış faturası · Onaylı · 14 May 2026',
    right: '$41,837.25',
  },
  {
    href: '/documents/sales-invoice',
    av: <FileText size={14} strokeWidth={1.75} />,
    title: (
      <>
        SALE-000034 · Mavi <mark>Elektronik</mark>
      </>
    ),
    meta: 'Satış faturası · Onaylı · 12 May 2026',
    right: '$3,900.00',
  },
  {
    href: '/documents/sales-invoice',
    av: <FileText size={14} strokeWidth={1.75} />,
    title: (
      <>
        SALE-000028 · <mark>Elektronik</mark> dünyası satışı
      </>
    ),
    meta: 'Satış faturası · Onaylı · 8 May 2026',
    right: '$2,180.00',
  },
];

const PARTNERS: Row[] = [
  {
    href: '/catalogs/partners',
    av: <span style={{ fontSize: 11, fontWeight: 700 }}>VB</span>,
    title: (
      <>
        Vatan Bilgisayar — Sanal <mark>Elektronik</mark>
      </>
    ),
    meta: 'Tedarikçi · VKN 1234567890 · 24 fatura',
    right: 'borç $52,140',
  },
  {
    href: '/catalogs/partners',
    av: <span style={{ fontSize: 11, fontWeight: 700 }}>ME</span>,
    title: (
      <>
        Mavi <mark>Elektronik</mark>
      </>
    ),
    meta: 'Müşteri · VKN 9876543210 · 18 fatura',
    right: 'alacak $3,900',
  },
  {
    href: '/catalogs/partners',
    av: <span style={{ fontSize: 11, fontWeight: 700 }}>ED</span>,
    title: (
      <>
        <mark>Elektronik</mark> Dünyası
      </>
    ),
    meta: 'Müşteri · 6 fatura',
    right: 'alacak $0',
  },
];

const PRODUCTS: Row[] = [
  {
    href: '/catalogs/products',
    av: <Folder size={14} strokeWidth={1.75} />,
    title: (
      <>
        <mark>Elektronik</mark> kategorisi
      </>
    ),
    meta: '218 ürün · 5 alt kategori',
    right: '218 ürün',
  },
  {
    href: '/catalogs/products',
    av: <span style={{ fontSize: 11, fontWeight: 700 }}>SS</span>,
    title: (
      <>
        SKU-0001 Samsung Galaxy S24 · <mark>Elektronik</mark>/Telefon
      </>
    ),
    meta: 'Stok: 200 · $1,300.00',
    right: '+15.4%',
  },
  {
    href: '/catalogs/products',
    av: <Package size={14} strokeWidth={1.75} />,
    title: (
      <>
        SKU-0042 LG Akıllı TV · <mark>Elektronik</mark>/TV
      </>
    ),
    meta: 'Stok: 12 · $890.00',
    right: '+5.1%',
  },
];

function Section({
  icon,
  title,
  count,
  rows,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  rows: Row[];
}) {
  return (
    <section className="search-group">
      <div className="group-head" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <strong style={{ color: 'var(--text)', textTransform: 'none' }}>{title}</strong>
        <span style={{ marginLeft: 'auto', textTransform: 'none' }}>{count} sonuç</span>
      </div>
      {rows.map((r, i) => (
        <Link key={`${r.href}-${i}`} href={r.href} className="search-result">
          <div className="ico">{r.av}</div>
          <div className="info">
            <div className="title">{r.title}</div>
            <div className="meta">{r.meta}</div>
          </div>
          <div className="dim mono" style={{ fontSize: 12.5 }}>
            {r.right}
          </div>
        </Link>
      ))}
    </section>
  );
}

export function V2SearchResults() {
  const [filter, setFilter] = useState<FilterKind>('all');
  const [q, setQ] = useState(Q);

  return (
    <>
      <div className="action-bar">
        <div className="left" style={{ flex: 1, gap: 8 }}>
          <div className="search-input" style={{ flex: 1 }}>
            <Search size={16} strokeWidth={1.75} />
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" />
          </div>
          <button className="btn btn-secondary btn-sm" type="button">
            <Filter size={14} strokeWidth={1.75} />
            Tür
          </button>
          <button className="btn btn-secondary btn-sm" type="button">
            <Calendar size={14} strokeWidth={1.75} />
            Tarih
          </button>
        </div>
        <div className="right dim">
          <b>{DOCS.length + PARTNERS.length + PRODUCTS.length}</b> sonuç · "{q}"
        </div>
      </div>

      <div className="search-filters">
        <button
          className={`search-filter${filter === 'all' ? ' is-active' : ''}`}
          type="button"
          onClick={() => setFilter('all')}
        >
          Hepsi
        </button>
        <button
          className={`search-filter${filter === 'documents' ? ' is-active' : ''}`}
          type="button"
          onClick={() => setFilter('documents')}
        >
          Belgeler ({DOCS.length})
        </button>
        <button
          className={`search-filter${filter === 'partners' ? ' is-active' : ''}`}
          type="button"
          onClick={() => setFilter('partners')}
        >
          Cari ({PARTNERS.length})
        </button>
        <button
          className={`search-filter${filter === 'products' ? ' is-active' : ''}`}
          type="button"
          onClick={() => setFilter('products')}
        >
          Ürün ({PRODUCTS.length})
        </button>
      </div>

      {(filter === 'all' || filter === 'documents') && (
        <Section
          icon={<FileText size={14} strokeWidth={1.75} />}
          title="Belgeler"
          count={12}
          rows={DOCS}
        />
      )}
      {(filter === 'all' || filter === 'partners') && (
        <Section
          icon={<Users size={14} strokeWidth={1.75} />}
          title="Müşteriler & Tedarikçiler"
          count={PARTNERS.length}
          rows={PARTNERS}
        />
      )}
      {(filter === 'all' || filter === 'products') && (
        <Section
          icon={<Package size={14} strokeWidth={1.75} />}
          title="Ürünler"
          count={25}
          rows={PRODUCTS}
        />
      )}
    </>
  );
}
