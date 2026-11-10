'use client';

import { Link } from '@/platform/i18n/navigation';
import { ChevronDown, Lock, Plus, Zap } from 'lucide-react';
import { useState } from 'react';

export function PriceTypeSplitCta() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`split-wrap${open ? ' is-open' : ''}`}>
      <div className="split-btn">
        <Link href="/catalogs/price-types/new?kind=static" className="btn btn-primary btn-sm">
          <Plus size={14} strokeWidth={1.75} />
          Yeni
        </Link>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          aria-label="Tür seç"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </div>
      <div className="split-menu" role="menu">
        <Link href="/catalogs/price-types/new?kind=static" className="split-item" role="menuitem">
          <Lock size={14} strokeWidth={1.75} style={{ marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600 }}>Statik fiyat türü</div>
            <div className="desc">Manuel sabit fiyatlar · her ürün için ayrı belirle</div>
          </div>
        </Link>
        <Link href="/catalogs/price-types/new?kind=dynamic" className="split-item" role="menuitem">
          <Zap size={14} strokeWidth={1.75} style={{ marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600 }}>Dinamik fiyat türü</div>
            <div className="desc">Başka türden % marj/indirim ile türetilir</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
