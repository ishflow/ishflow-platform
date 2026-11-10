import { BulkPriceChange } from '@/components/v2/catalogs/price-types/bulk-price-change';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2CatalogsBulkPriceChangePage() {
  return (
    <>
      <V2Topbar
        breadcrumb="Kataloglar / Ürünler / Toplu fiyat değişimi"
        title="Toplu Fiyat Değişimi"
        subtitle="Adım 2/3 · 142 ürün etkilenecek"
      />
      <div className="content">
        <BulkPriceChange />
      </div>
    </>
  );
}
