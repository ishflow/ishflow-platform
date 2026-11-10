import bcrypt from 'bcrypt';

/**
 * Verify a presented API key against a stored bcrypt hash.
 *
 * Returns `false` on any thrown error (corrupted hash, unsupported algorithm,
 * etc.) so callers can treat a failure-to-verify the same as a wrong key.
 */
export async function verifyApiKey(presented: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(presented, hash);
  } catch {
    return false;
  }
}
