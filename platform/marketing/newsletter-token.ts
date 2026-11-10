/**
 * Signed-token helper for double opt-in newsletter confirmations.
 *
 * Tokens are HMAC-SHA256 of `subscriberId:email` using a secret env var.
 * Encoded as URL-safe base64 + the subscriber id (joined by `.`).
 *
 * Falls back to MOBILE_JWT_SECRET when MARKETING_TOKEN_SECRET is not
 * configured — both are HS256 secrets already in use in dev/prod.
 */

import crypto from 'node:crypto';

function getSecret(): string {
  const secret =
    process.env.MARKETING_TOKEN_SECRET ??
    process.env.MOBILE_JWT_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    'dev-only-marketing-token-secret';
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function signNewsletterToken(subscriberId: string, email: string): string {
  const sig = sign(`${subscriberId}:${email.toLowerCase()}`);
  return `${subscriberId}.${sig}`;
}

export interface VerifiedToken {
  subscriberId: string;
}

export function verifyNewsletterToken(token: string, email: string): VerifiedToken | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [subscriberId, sig] = token.split('.', 2);
  if (!subscriberId || !sig) return null;
  const expected = sign(`${subscriberId}:${email.toLowerCase()}`);
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return { subscriberId };
}
