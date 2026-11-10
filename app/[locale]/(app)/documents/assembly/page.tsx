import '@/configs';
import { renderV2DocumentList } from '@/components/v2/documents/render-document-list';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return renderV2DocumentList('assembly');
}
