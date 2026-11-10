import { V2PaymentMethods } from '@/components/v2/settings/billing/payment-methods';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2PaymentMethodsPage() {
  return (
    <>
      <V2Topbar
        breadcrumb="Ayarlar / Faturalandırma / Ödeme yöntemleri"
        title="Ödeme yöntemleri"
        subtitle="Kartlar Stripe'ta saklanır"
      />
      <div className="content">
        <V2PaymentMethods />
      </div>
    </>
  );
}
