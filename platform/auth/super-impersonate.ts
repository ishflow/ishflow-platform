const COOKIE_NAME = '__1c_super_impersonate';
const TTL_MS = 15 * 60 * 1000;

interface Payload {
  actorClerkId: string;
  tenantId: string;
  exp: number;
}

function secretBytes(): ArrayBuffer {
  const s = process.env.SUPER_ADMIN_IMPERSONATION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SUPER_ADMIN_IMPERSONATION_SECRET missing or too short');
  }
  const enc = new TextEncoder().encode(s);
  const buf = new ArrayBuffer(enc.byteLength);
  new Uint8Array(buf).set(enc);
  return buf;
}

function encodeUtf8(s: string): ArrayBuffer {
  const enc = new TextEncoder().encode(s);
  const buf = new ArrayBuffer(enc.byteLength);
  new Uint8Array(buf).set(enc);
  return buf;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', secretBytes(), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

export async function signCookie(input: {
  actorClerkId: string;
  tenantId: string;
}): Promise<string> {
  const payload: Payload = { ...input, exp: Date.now() + TTL_MS };
  const body = toBase64Url(encodeUtf8(JSON.stringify(payload)));
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encodeUtf8(body));
  return `${body}.${toBase64Url(sig)}`;
}

export async function verifyCookie(value: string | undefined | null): Promise<Payload | null> {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;
  try {
    const key = await getKey();
    const ok = await crypto.subtle.verify('HMAC', key, fromBase64Url(sig), encodeUtf8(body));
    if (!ok) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(new Uint8Array(fromBase64Url(body))),
    ) as Payload;
    if (payload.exp < Date.now()) return null;
    if (!payload.actorClerkId || !payload.tenantId) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SUPER_IMPERSONATE_COOKIE = COOKIE_NAME;
export const SUPER_IMPERSONATE_HEADER = 'x-super-impersonate';
