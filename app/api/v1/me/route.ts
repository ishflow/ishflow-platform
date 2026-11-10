/**
 * `GET /api/v1/me` — return the API-key's owning tenant + scope + creator.
 *
 * Useful as a connectivity / sanity check for integrators: they can verify the
 * key authenticates, learn which tenant it scopes to, and confirm whether it
 * was minted with `read` or `write` scope before issuing real calls.
 *
 * `keyPrefix` is sliced from the Authorization header — the resolved
 * `AppContext` doesn't carry the prefix and we don't want an extra DB
 * roundtrip just to surface a 16-char string the caller already has.
 *
 * See the internal design spec §"Public
 * endpoints" row `/me`.
 */

import { ApiKeyAuthError } from '@/platform/auth/current-context';
import { getApiKeyScope, requireApiKey } from '../_lib/auth';
import { respondData, respondError } from '../_lib/respond';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const ctx = await requireApiKey(req, 'read');
    const scope = getApiKeyScope(ctx);

    // Prefix length matches the `1ca_live_<7>` shape minted by
    // `platform/api-keys/generate.ts` — i.e. 16 chars including the tag.
    const auth = req.headers.get('authorization') ?? '';
    const keyPrefix = auth.startsWith('Bearer 1ca_live_') ? auth.slice(7, 23) : null;

    return respondData({
      tenantId: ctx.tenant?.id ?? null,
      tenantName: ctx.tenant?.name ?? null,
      scope,
      keyPrefix,
      createdBy: ctx.user
        ? {
            id: ctx.user.id,
            email: ctx.user.email,
            firstName: ctx.user.firstName,
            lastName: ctx.user.lastName,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof ApiKeyAuthError) return respondError(e.code, e.message, e.status);
    const msg = (e as Error)?.message ?? 'Unexpected error';
    process.stderr.write(`[/api/v1/me] ${msg}\n`);
    return respondError('internal_error', 'Unexpected error', 500);
  }
}
