/**
 * Subscription system master gates.
 *
 * Live gate now lives in `feature-state.ts` (DB-backed PlatformSetting with
 * env fallback). This module re-exports the async helpers for back-compat —
 * call sites should prefer `isSubscriptionPaymentsEnabledAsync()` directly.
 */

export {
  getSubscriptionFeatureState,
  isSubscriptionFeatureVisible,
  isSubscriptionPaymentsEnabledAsync,
  setSubscriptionFeatureState,
  type SubscriptionFeatureState,
} from './feature-state';
