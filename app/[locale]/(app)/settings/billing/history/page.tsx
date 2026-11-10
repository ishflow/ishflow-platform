import { V2BillingHistory } from '@/components/v2/settings/billing/history';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2BillingHistoryPage() {
  return (
    <>
      <V2Topbar
        breadcrumb="Ayarlar / Faturalandırma / Geçmiş"
        title="Abonelik tarihçesi"
        subtitle="Tüm plan değişiklikleri ve faturalar"
      />
      <div className="content">
        <V2BillingHistory />
      </div>
    </>
  );
}
