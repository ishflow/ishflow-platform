import { Link } from '@/platform/i18n/navigation';

export type Product360Tab = 'general' | 'sales' | 'purchases' | 'priceHistory' | 'stock';

const LABELS: Record<Product360Tab, string> = {
  general: 'Genel',
  sales: 'Satış geçmişi · 124',
  purchases: 'Alım geçmişi · 18',
  priceHistory: 'Fiyat geçmişi',
  stock: 'Stok hareketi · 312',
};

export function Product360Tabbar({
  productId,
  active,
}: {
  productId: string;
  active: Product360Tab;
}) {
  const tabs: Array<{ key: Product360Tab; href: string }> = [
    { key: 'general', href: `/catalogs/products/${productId}/360` },
    { key: 'sales', href: '#' },
    { key: 'purchases', href: '#' },
    {
      key: 'priceHistory',
      href: `/catalogs/products/${productId}/360/price-history`,
    },
    { key: 'stock', href: '#' },
  ];

  return (
    <div className="tabbar">
      {tabs.map((t) =>
        t.href === '#' ? (
          <a key={t.key} href={t.href} className={active === t.key ? 'is-active' : undefined}>
            {LABELS[t.key]}
          </a>
        ) : (
          <Link key={t.key} href={t.href} className={active === t.key ? 'is-active' : undefined}>
            {LABELS[t.key]}
          </Link>
        ),
      )}
    </div>
  );
}
