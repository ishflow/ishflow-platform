import { notFound } from 'next/navigation';
import { featureEnabled } from './feature-flags';
import { loadEnabledFeatures } from './load-enabled-features';

/**
 * Route gate: hard-404 when a feature is globally disabled. Mirrors
 * `assertSuperAdmin` — apply it in a feature's route layout so a hidden feature
 * can't be reached by typing its URL, not just by hiding the nav item.
 */
export async function assertFeatureEnabled(feature: string): Promise<void> {
  const enabled = await loadEnabledFeatures();
  if (!featureEnabled(enabled, feature)) notFound();
}
