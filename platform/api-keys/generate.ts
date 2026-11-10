import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';

/**
 * Result of generating a new API key.
 *
 * `fullKey` is shown to the operator exactly once — it is never persisted.
 * Only `prefix` (for lookup + UI display) and `hash` (for verification) are
 * stored in the `api_key` table.
 */
export interface GeneratedApiKey {
  /** Full bearer token: `1ca_live_<32 hex>` — 41 chars total. */
  fullKey: string;
  /** First 16 chars of `fullKey` (= `1ca_live_` + first 7 hex). Indexed in DB. */
  prefix: string;
  /** `bcrypt(fullKey, 10)` — stored in `api_key.key_hash`. */
  hash: string;
}

const KEY_PREFIX = '1ca_live_';
const BCRYPT_COST = 10;
const PREFIX_LENGTH = 16;
const RANDOM_BYTES = 16; // 128 bits → 32 hex chars

/**
 * Generate a new API key with prefix + bcrypt hash.
 *
 * Format: `1ca_live_<32 lowercase hex>` — total 41 chars (9 prefix + 32 body).
 * Randomness: 128 bits via `crypto.randomBytes(16)`.
 */
export async function generateApiKey(): Promise<GeneratedApiKey> {
  const body = randomBytes(RANDOM_BYTES).toString('hex').replace(/\s+/g, '');
  const fullKey = `${KEY_PREFIX}${body}`;
  const prefix = fullKey.slice(0, PREFIX_LENGTH);
  const hash = await bcrypt.hash(fullKey, BCRYPT_COST);
  return { fullKey, prefix, hash };
}
