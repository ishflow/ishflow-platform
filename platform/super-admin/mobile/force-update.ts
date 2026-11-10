/**
 * Pure semver comparison + force-update evaluation for the mobile clients.
 *
 * The super-admin Mobile section writes minimum app versions to
 * `PlatformSetting` (see `min-versions.ts`). This module turns those configured
 * minimums + a client-reported version into a force-update decision that the
 * mobile API surfaces (e.g. on `/me`).
 *
 * FAIL-OPEN is the governing rule: we must never accidentally brick existing
 * clients. `required` is only ever `true` when we have a *parseable* client
 * version that is *strictly below* a *configured* minimum for the client's
 * platform. Any ambiguity (unknown platform, missing/garbage version, no
 * configured minimum) resolves to `required: false`.
 */
import type { MinVersionState } from './min-versions';

export type MobilePlatform = 'ios' | 'android';

export interface ForceUpdateInput {
  platform: MobilePlatform | null;
  clientVersion: string | null;
  min: MinVersionState;
}

export interface ForceUpdateResult {
  required: boolean;
  minVersion: string | null;
  platform: MobilePlatform | null;
}

/**
 * Parse a dot-segmented version string into numeric segments.
 *
 * Returns `null` when the input is missing, empty, or contains any
 * non-numeric segment (e.g. `"1.x.0"`, `"latest"`, `""`). Pre-release/build
 * suffixes are not supported — a segment like `"6-beta"` fails to parse and
 * therefore fails open. Trailing/leading whitespace and a leading `v` are
 * tolerated (`"v1.6.0"` -> `[1, 6, 0]`).
 */
function parseSegments(input: string | null | undefined): number[] | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/^v/i, '');
  if (trimmed.length === 0) return null;
  const parts = trimmed.split('.');
  const segments: number[] = [];
  for (const part of parts) {
    // Strictly numeric segments only — reject "1a", "", "-1", "1.5e2", etc.
    if (!/^\d+$/.test(part)) return null;
    const n = Number.parseInt(part, 10);
    if (!Number.isFinite(n)) return null;
    segments.push(n);
  }
  return segments;
}

/**
 * Numeric dot-segment version compare.
 *
 * Returns `-1` if `a < b`, `1` if `a > b`, `0` if equal. Missing trailing
 * segments are treated as `0` so `"1.6"` === `"1.6.0"`. Numeric comparison
 * makes `"1.9.0" < "1.10.0"` (unlike a lexicographic string compare).
 *
 * If either input is unparseable, returns `0` (treated as equal) so callers
 * that fail open won't flag an update from garbage input.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const segA = parseSegments(a);
  const segB = parseSegments(b);
  if (segA === null || segB === null) return 0;

  const len = Math.max(segA.length, segB.length);
  for (let i = 0; i < len; i++) {
    const x = segA[i] ?? 0;
    const y = segB[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * Decide whether the reporting client must force-update.
 *
 * Fail-open: `required` is `true` only when (1) the platform is known,
 * (2) a minimum is configured for that platform, (3) the client version
 * parses, and (4) the client version is strictly below the configured
 * minimum. Every other case returns `required: false`.
 */
export function evaluateForceUpdate(input: ForceUpdateInput): ForceUpdateResult {
  const { platform, clientVersion, min } = input;

  // Unknown platform -> can't pick a minimum -> fail open.
  if (platform !== 'ios' && platform !== 'android') {
    return { required: false, minVersion: null, platform: null };
  }

  const minVersion = platform === 'ios' ? min.ios : min.android;

  // No configured minimum for this platform -> fail open.
  if (minVersion === null) {
    return { required: false, minVersion: null, platform };
  }

  // Missing / unparseable client version -> fail open (but report the min so
  // the client can still learn the target if it wants to).
  if (parseSegments(clientVersion) === null) {
    return { required: false, minVersion, platform };
  }

  // The configured minimum itself must be parseable; if an operator stored
  // garbage, fail open rather than force-updating everyone.
  if (parseSegments(minVersion) === null) {
    return { required: false, minVersion, platform };
  }

  // clientVersion is non-null here (parseSegments returned non-null).
  const required = compareVersions(clientVersion as string, minVersion) < 0;
  return { required, minVersion, platform };
}
