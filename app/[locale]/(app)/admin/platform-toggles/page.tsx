import { renderV2Settings } from '@/components/v2/settings/render-settings';

export default async function V2PlatformTogglesPage() {
  return renderV2Settings({ slug: 'admin.platform_toggles' });
}
