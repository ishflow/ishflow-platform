import { ProductOrganizer } from '@/components/v2/catalogs/products/product-organizer';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2CatalogsProductsOrganizerPage() {
  return (
    <>
      <V2Topbar
        breadcrumb="Kataloglar / Tüm ürünler > Elektronik > Telefon"
        title="Ürünler"
        subtitle="Номенклатура · ağaç görünümü"
      />
      <div className="content">
        <ProductOrganizer />
      </div>
    </>
  );
}
