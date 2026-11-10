import { V2BillingHandoff } from '@/components/v2/settings/billing/handoff';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2BillingHandoffPage() {
  return (
    <>
      <V2Topbar breadcrumb="Ayarlar / Faturalandırma / Handoff" title="Stripe'a yönlendirme" />
      <div className="content">
        <V2BillingHandoff />
      </div>
    </>
  );
}
