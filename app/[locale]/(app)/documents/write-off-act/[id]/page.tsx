import { renderV2DocumentDetail } from '@/components/v2/documents/generic-document-page';

export const dynamic = 'force-dynamic';

export default async function V2WriteOffActDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderV2DocumentDetail({ slug: 'write-off-act', id });
}
