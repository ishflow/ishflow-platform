import { V2CancelFlow } from '@/components/v2/settings/billing/cancel-flow';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2BillingCancelPage() {
  return (
    <>
      <V2Topbar
        breadcrumb="Ayarlar / Faturalandırma / İptal"
        title="Aboneliği iptal et"
        subtitle="3 adım — sebep, teklif, onay"
      />
      <div className="content">
        <V2CancelFlow />
      </div>
    </>
  );
}
