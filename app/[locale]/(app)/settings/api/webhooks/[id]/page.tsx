import { V2WebhookDetail } from '@/components/v2/settings/webhook-detail';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default async function V2WebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <V2Topbar
        breadcrumb="Ayarlar / API & Webhook / Endpoint"
        title="Webhook endpoint'i"
        subtitle="URL, gizli anahtar, abone olunan olaylar ve teslimat geçmişi"
      />
      <div className="content">
        <V2WebhookDetail id={id} />
      </div>
    </>
  );
}
