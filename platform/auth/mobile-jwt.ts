import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'canalog-mobile';
const AUDIENCE = 'canalog-mobile-app';

export interface MobileJWTClaims {
  userId: string;
  tenantId: string | null;
  scopes: string[];
}

function secret(): Uint8Array {
  const raw = process.env.MOBILE_JWT_SECRET;
  if (!raw) throw new Error('MOBILE_JWT_SECRET is not set');
  return new TextEncoder().encode(raw);
}

export async function signMobileJWT(claims: MobileJWTClaims): Promise<string> {
  return new SignJWT({ tid: claims.tenantId, scopes: claims.scopes })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyMobileJWT(token: string): Promise<MobileJWTClaims> {
  const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE });
  return {
    userId: String(payload.sub),
    tenantId: (payload.tid as string | null | undefined) ?? null,
    scopes: Array.isArray(payload.scopes) ? (payload.scopes as string[]) : [],
  };
}
