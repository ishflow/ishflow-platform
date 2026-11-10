import { renderV2Settings } from '@/components/v2/settings/render-settings';

export default async function V2OrganizationSettingsPage() {
  return renderV2Settings({ slug: 'admin.organization' });
}
