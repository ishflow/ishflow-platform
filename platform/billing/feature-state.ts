/**
 * Subscription feature state — global platform setting.
 *
 * Three states:
 * - `enabled`  → Full Stripe Checkout / Billing Portal flow. Plan picker
 *                interactive. Trial banner active. Default.
 * - `disabled` → UI visible but payment CTAs disabled with "Contact admin"
 *                copy. Used when shipping to regions without Stripe support
 *                while we wire up local payments.
 * - `hidden`   → UI not rendered at all. /admin/billing returns 404, mobile
 *                /api/mobile/billing returns 404, Settings menu item is
 *                stripped, sidebar nav entry is removed. Use when the
 *                operator wants subscription completely out of sight.
 *
 * Stored in `PlatformSetting` (global, RLS-bypassed). The legacy env var
 * `SUBSCRIPTION_PAYMENTS_ENABLED` still acts as a fallback for fresh
 * environments that haven't written a row yet. In-memory cache (60s TTL) so
 * the gate doesn't hit the DB on every page render.
 */
import { withBypass } from '@/platform/db/tenant-context';

export type SubscriptionFeatureState = 'enabled' | 'disabled' | 'hidden';

const SETTING_KEY = 'subscription.feature_state';
const CACHE_TTL_MS = 60_000;

interface CachedState {
  value: SubscriptionFeatureState;
  fetchedAt: number;
}

let cache: CachedState | undefined;

export function clearSubscriptionFeatureStateCache(): void {
  cache = undefined;
}

function envFallback(): SubscriptionFeatureState {
  const raw = (process.env.SUBSCRIPTION_PAYMENTS_ENABLED ?? '').toLowerCase().trim();
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') {
    return 'enabled';
  }
  // Default when no DB row and no env hint: `enabled` — Stripe credentials
  // are checked at request time and the page degrades gracefully if they're
  // missing. Operators who want UI hidden flip the DB setting via super admin.
  return 'enabled';
}

function parseState(input: unknown): SubscriptionFeatureState | null {
  if (typeof input === 'string') {
    if (input === 'enabled' || input === 'disabled' || input === 'hidden') {
      return input;
    }
  }
  if (input && typeof input === 'object' && 'state' in input) {
    return parseState((input as { state: unknown }).state);
  }
  return null;
}

export async function getSubscriptionFeatureState(): Promise<SubscriptionFeatureState> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }
  try {
    const row = await withBypass((tx) =>
      tx.platformSetting.findUnique({ where: { key: SETTING_KEY } }),
    );
    const parsed = row ? parseState(row.value) : null;
    const resolved = parsed ?? envFallback();
    cache = { value: resolved, fetchedAt: Date.now() };
    return resolved;
  } catch {
    return envFallback();
  }
}

export async function setSubscriptionFeatureState(
  state: SubscriptionFeatureState,
  updatedBy: string | null,
): Promise<void> {
  await withBypass((tx) =>
    tx.platformSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: state, updatedBy: updatedBy ?? undefined },
      update: { value: state, updatedBy: updatedBy ?? undefined },
    }),
  );
  clearSubscriptionFeatureStateCache();
}

export async function isSubscriptionPaymentsEnabledAsync(): Promise<boolean> {
  const state = await getSubscriptionFeatureState();
  return state === 'enabled';
}

export async function isSubscriptionFeatureVisible(): Promise<boolean> {
  const state = await getSubscriptionFeatureState();
  return state !== 'hidden';
}
