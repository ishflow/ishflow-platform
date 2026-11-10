import { getTranslations } from 'next-intl/server';
import { LaunchRedirect } from './launch-redirect';

/**
 * Post-sign-in landing. Clerk redirects here (soft nav); this screen
 * hard-navigates to the dashboard so the `(app)` layout re-renders with its
 * full shell. Sits in `(auth-public)` to inherit the Aurora auth surface.
 */
export default async function LaunchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('v2_marketing.launch');
  return <LaunchRedirect locale={locale} message={t('title')} />;
}
