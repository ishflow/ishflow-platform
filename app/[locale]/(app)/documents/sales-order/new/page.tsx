import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2SalesOrderNewPage() {
  return renderV2DocumentNew({ slug: 'sales-order' });
}
