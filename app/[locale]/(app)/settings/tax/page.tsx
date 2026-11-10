import { renderV2Settings } from '@/components/v2/settings/render-settings';

export default async function V2TaxSettingsPage() {
  return renderV2Settings({ slug: 'admin.tax' });
}
