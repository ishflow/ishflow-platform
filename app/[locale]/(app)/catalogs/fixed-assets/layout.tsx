import { assertFeatureEnabled } from '@/platform/features/assert-feature-enabled';
import type { ReactNode } from 'react';

/**
 * Feature gate for the Fixed Assets (Demirbaşlar) catalog. 404s the list AND
 * the /new wizard when `assets.fixed_asset` is globally disabled in
 * super-admin, so a hidden feature isn't reachable by direct URL.
 */
export default async function FixedAssetsLayout({ children }: { children: ReactNode }) {
  await assertFeatureEnabled('assets.fixed_asset');
  return <>{children}</>;
}
