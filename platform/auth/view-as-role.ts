import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'view-as-role';
const TTL_MS = 60 * 60 * 1000; // 1 hour

const NON_IMPERSONATABLE_ROLES = new Set<string>(['owner']);

export function canImpersonateRole(role: string): boolean {
  return !NON_IMPERSONATABLE_ROLES.has(role);
}

function hmac(role: string, ts: number, secret: string): string {
  return createHmac('sha256', secret).update(`${role}:${ts}`).digest('base64url');
}

export function signViewAsCookie(role: string, secret: string): string {
  if (!canImpersonateRole(role)) {
    throw new Error(`Role "${role}" cannot be impersonated`);
  }
  const ts = Date.now();
  const sig = hmac(role, ts, secret);
  const payload = Buffer.from(JSON.stringify({ role, ts })).toString('base64url');
  return `${payload}.${sig}`;
}

export function verifyViewAsCookie(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let parsed: { role: string; ts: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (typeof parsed.role !== 'string' || typeof parsed.ts !== 'number') return null;
  if (Date.now() - parsed.ts > TTL_MS) return null;

  const expected = hmac(parsed.role, parsed.ts, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard first so a malformed
  // cookie returns null instead of raising. Finding E7.
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return parsed.role;
}

export { COOKIE_NAME };
