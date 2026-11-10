import '@/configs';

import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export const dynamic = 'force-dynamic';

/**
 * V2 price-setting "new" page — fully generic V2DocumentWizard route.
 *
 * Driven entirely from `configs/inventory/documents/price-setting.ts` DSL.
 */
export default async function V2PriceSettingNewPage() {
  return renderV2DocumentNew({ slug: 'price-setting' });
}
