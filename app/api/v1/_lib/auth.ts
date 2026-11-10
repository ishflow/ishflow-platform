import type { AppContext } from '@/platform/auth/current-context';
import { resolveContext } from '@/platform/auth/current-context';
import { ApiKeyAuthError } from '@/platform/auth/resolve-api-key';

const KEY_PREFIX_TAG = '1ca_live_';

/**
 * Action verbs that prove a key holds the `write` scope. Derived from
 * `WRITE_ACTIONS` in `platform/api-keys/permissions.ts` — kept in sync there;
 * if a new write-verb is added to the catalog, mirror it here.
 *
 * Detected by scanning the resolved permission set rather than re-querying the
 * `ApiKey` row: the bearer dispatch has already executed bcrypt + scope
 * expansion, so the permissions are a faithful projection of the key's scope.
 * Constant-time over the set, no extra DB roundtrip.
 */
const WRITE_ACTION_SUFFIXES = [':create', ':update', ':delete', ':post', ':unpost', ':write'];

/**
 * Inspect the resolved AppContext permission set and report the derived scope
 * of the API key behind it. A key with any write-action permission was minted
 * with `write` scope; otherwise it was minted with `read`.
 *
 * Safe to call on any AppContext — including cookie-session contexts — but
 * the scope notion is only meaningful for API-key auth. `/api/v1/*` routes
 * should always go through `requireApiKey` first.
 */
export function getApiKeyScope(ctx: AppContext): 'read' | 'write' {
  for (const perm of ctx.permissions) {
    for (const suffix of WRITE_ACTION_SUFFIXES) {
      if (perm.endsWith(suffix)) return 'write';
    }
  }
  return 'read';
}

/**
 * Authenticate a `/api/v1/*` request and enforce the endpoint's required scope.
 *
 * Failure modes — all surface as `ApiKeyAuthError` thrown synchronously after
 * an await; the calling route handler catches and converts via `respondError`:
 *
 *   - 401 `unauthorized`      — Authorization header missing or not `Bearer ...`
 *   - 401 `invalid_api_key`   — token isn't a `1ca_live_*` API key, or the
 *                                bearer dispatch returned null (no candidate,
 *                                bcrypt mismatch, or revoked row)
 *   - 402 `feature_locked`    — propagated from the bearer dispatch when the
 *                                tenant's plan lacks `apiAccess`
 *   - 403 `insufficient_scope`— key is read-only but endpoint needs write
 *
 * On success, returns the AppContext. Tenant is guaranteed non-null because
 * `resolveApiKeyBearer` (in current-context.ts) rejects tenant-less keys with
 * the 402 throw.
 */
export async function requireApiKey(
  req: Request,
  requiredScope: 'read' | 'write',
): Promise<AppContext> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !/^bearer /i.test(authHeader)) {
    throw new ApiKeyAuthError(401, 'unauthorized', 'Missing or malformed Authorization header');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new ApiKeyAuthError(401, 'unauthorized', 'Missing or malformed Authorization header');
  }

  // Explicit format reject: keep Clerk JWTs / mobile JWTs out of the public
  // API surface. They use different bearer schemes and must not authenticate
  // here even if `resolveContext` would otherwise accept them.
  if (!token.startsWith(KEY_PREFIX_TAG)) {
    throw new ApiKeyAuthError(401, 'invalid_api_key', 'Not an API key');
  }

  // Delegate to the shared resolver. It runs the API-key branch of the bearer
  // dispatch (bcrypt + apiAccess gate) and throws `ApiKeyAuthError` on plan
  // mismatch (402). We let that throw propagate untouched.
  const ctx = await resolveContext({ headers: req.headers });
  if (!ctx) {
    throw new ApiKeyAuthError(401, 'invalid_api_key', 'API key not found or revoked');
  }

  if (requiredScope === 'write' && getApiKeyScope(ctx) === 'read') {
    throw new ApiKeyAuthError(
      403,
      'insufficient_scope',
      'This endpoint requires a write-scope API key',
    );
  }

  return ctx;
}
