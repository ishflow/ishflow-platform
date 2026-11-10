import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'canalog-mobile';
const AUDIENCE = 'canalog-billing-handoff';

export type HandoffTarget = 'checkout' | 'portal' | 'overview';

export interface HandoffPayload {
  userId: string;
  tenantId: string;
  target: HandoffTarget;
  plan?: string;
  interval?: 'month' | 'year';
  jti: string;
}

function secret(): Uint8Array {
  const raw = process.env.MOBILE_JWT_SECRET;
  if (!raw) throw new Error('MOBILE_JWT_SECRET is not set');
  return new TextEncoder().encode(raw);
}

export async function mintHandoffToken(input: Omit<HandoffPayload, 'jti'>): Promise<string> {
  const jti = randomUUID();
  return new SignJWT({
    tenantId: input.tenantId,
    target: input.target,
    ...(input.plan !== undefined ? { plan: input.plan } : {}),
    ...(input.interval !== undefined ? { interval: input.interval } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(jti)
    .setExpirationTime('5m')
    .setIssuedAt()
    .sign(secret());
}

export async function verifyHandoffToken(token: string): Promise<HandoffPayload> {
  // TODO(billing): persist JTI to make single-use
  const { payload } = await jwtVerify(token, secret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload.sub !== 'string') throw new Error('handoff: missing sub');
  if (typeof payload.jti !== 'string') throw new Error('handoff: missing jti');

  const tenantId = (payload as { tenantId?: string }).tenantId;
  if (!tenantId) throw new Error('handoff: missing tenantId');

  const target = (payload as { target?: HandoffTarget }).target;
  if (target !== 'checkout' && target !== 'portal' && target !== 'overview') {
    throw new Error('handoff: invalid target');
  }

  const plan = (payload as { plan?: string }).plan;
  const interval = (payload as { interval?: 'month' | 'year' }).interval;

  return {
    userId: payload.sub,
    tenantId,
    target,
    ...(plan !== undefined ? { plan } : {}),
    ...(interval !== undefined ? { interval } : {}),
    jti: payload.jti,
  };
}
