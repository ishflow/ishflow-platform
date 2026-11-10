import '@/configs';

import { renderV2DocumentDetail } from '@/components/v2/documents/generic-document-page';

export const dynamic = 'force-dynamic';

export default async function V2PriceSettingDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return renderV2DocumentDetail({ slug: 'price-setting', id });
}
