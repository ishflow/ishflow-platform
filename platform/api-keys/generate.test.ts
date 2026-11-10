import { describe, expect, it } from 'vitest';
import { generateApiKey } from './generate';
import { verifyApiKey } from './hash';

describe('generateApiKey', () => {
  it('produces a fullKey with the 1ca_live_ prefix and length 41', async () => {
    const { fullKey } = await generateApiKey();
    expect(fullKey.startsWith('1ca_live_')).toBe(true);
    expect(fullKey).toHaveLength(41);
  });

  it('produces a prefix of length 16 equal to fullKey.slice(0, 16)', async () => {
    const { fullKey, prefix } = await generateApiKey();
    expect(prefix).toHaveLength(16);
    expect(prefix).toBe(fullKey.slice(0, 16));
  });

  it('produces a valid bcrypt hash (starts with $2)', async () => {
    const { hash } = await generateApiKey();
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('matches /^1ca_live_[a-f0-9]{32}$/ (lowercase hex body)', async () => {
    const { fullKey } = await generateApiKey();
    expect(fullKey).toMatch(/^1ca_live_[a-f0-9]{32}$/);
  });

  it('two consecutive calls produce different fullKeys (randomness)', async () => {
    const a = await generateApiKey();
    const b = await generateApiKey();
    expect(a.fullKey).not.toBe(b.fullKey);
  });

  it('verifyApiKey returns true for the correct fullKey', async () => {
    const { fullKey, hash } = await generateApiKey();
    await expect(verifyApiKey(fullKey, hash)).resolves.toBe(true);
  });

  it('verifyApiKey returns false for a wrong key against the same hash', async () => {
    const { hash } = await generateApiKey();
    const wrong = `1ca_live_${'x'.repeat(32)}`;
    await expect(verifyApiKey(wrong, hash)).resolves.toBe(false);
  });
});
