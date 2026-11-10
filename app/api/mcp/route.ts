/**
 * ishflow MCP server endpoint.
 *
 * Implements the Model Context Protocol over HTTP (web-standard streamable
 * transport). Bearer auth via existing API key dispatch in `requireApiKey`;
 * per-tool scope gating runs inside `dispatchTool`.
 *
 * Auth floor is `read` — every authenticated request can at least invoke
 * read-scope tools. Tools that need `write` or `platform_admin` enforce that
 * themselves at dispatch time so a single read key can never escalate by
 * naming a higher-rank tool.
 *
 * Spec: internal design doc (not in this repo)
 */
import { requireApiKey } from '@/app/api/v1/_lib/auth';
import { ApiKeyAuthError } from '@/platform/auth/resolve-api-key';
import { type McpToolContext, createMcpServer, tr } from '@ishflow/mcp-tools';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import '@/configs'; // populate the DSL registry for downstream tools

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPPORTED_LOCALES = ['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Best-effort Accept-Language → locale resolution. Picks the first two-letter
 * tag, falls back to `ru` (primary market). Quality-value parsing is out of
 * scope here; tools that need richer negotiation can pass through `ctx.locale`
 * and re-resolve.
 */
function pickLocale(header: string | null): SupportedLocale {
  if (!header) return 'ru';
  const first = header.split(',')[0]?.trim().slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(first ?? '')
    ? (first as SupportedLocale)
    : 'ru';
}

function unauthorized(message: string, locale: SupportedLocale): Response {
  const translated = tr('tool.errors.unauthorized', locale) ?? message;
  return new Response(JSON.stringify({ error: { code: 'unauthorized', message: translated } }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Resolve the per-request context and build an MCP transport on top of it.
 * Returns either a `Response` (auth failure, ready to return) or the tuple
 * needed to call `transport.handleRequest`. Centralised so POST / GET /
 * DELETE all share the same gate.
 */
async function authenticateAndBuildTransport(
  req: Request,
): Promise<
  | { ok: false; response: Response }
  | { ok: true; transport: WebStandardStreamableHTTPServerTransport }
> {
  // Resolve locale up-front so every error response can be translated. Auth
  // failures happen before we have an AppContext, so the request's
  // Accept-Language header is the only signal we have here.
  const locale = pickLocale(req.headers.get('Accept-Language'));

  let appCtx: Awaited<ReturnType<typeof requireApiKey>>;
  try {
    appCtx = await requireApiKey(req, 'read');
  } catch (err) {
    if (err instanceof ApiKeyAuthError) {
      // Preserve the auth-layer code (e.g. `invalid_api_key`) on the wire so
      // existing API-key clients keep their assertions stable. Translate the
      // human-readable message via the shared MCP i18n catalog; fall back to
      // `internal_error` text if the code isn't in the catalog (defensive —
      // every known auth code has a corresponding key).
      const code = err.code;
      const translated =
        tr(`tool.errors.${code}`, locale) ?? tr('tool.errors.internal_error', locale) ?? '';
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: { code, message: translated } }), {
          status: err.status,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: {
            code: 'internal_error',
            message: tr('tool.errors.internal_error', locale) ?? '',
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  if (!appCtx.apiKey) {
    // Defensive — `requireApiKey` only accepts `1ca_live_*` tokens and runs
    // through `resolveApiKeyContext`, which attaches `apiKey` on success.
    // Reaching this branch implies a resolver bug or an upstream contract
    // change; refuse rather than mint a context without key attribution.
    return { ok: false, response: unauthorized('API key required', locale) };
  }

  const correlationId = crypto.randomUUID();

  const mcpCtx: McpToolContext = {
    tenantId: appCtx.tenant?.id ?? null,
    userId: appCtx.user?.id ?? null,
    apiKeyId: appCtx.apiKey.id,
    scope: appCtx.apiKey.scope,
    locale,
    correlationId,
    // Forward the full AppContext as a structural blob. Catalog / document /
    // register tools downcast through `McpAppContext` (declared structurally
    // in @ishflow/mcp-tools) and pass it to the engine helpers, which take an
    // AppContext (not a tx). Without this, the engine can't enforce
    // per-entity permissions or buyer-scope rules.
    appContext: appCtx as unknown as McpToolContext['appContext'],
  };

  const server = createMcpServer(mcpCtx);
  // Stateless mode: each request mints a fresh server + transport.
  // `sessionIdGenerator: undefined` disables MCP session tracking; the JSON
  // response shape (`enableJsonResponse: true`) drops SSE so standard HTTP
  // clients can consume the result without a streaming reader. If a client
  // ever needs stateful sessions (e.g., Claude Desktop's resumable streams),
  // wire a module-level Map<sessionId, transport> here and key by the
  // `mcp-session-id` header.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return { ok: true, transport };
}

export async function POST(req: Request): Promise<Response> {
  const result = await authenticateAndBuildTransport(req);
  if (!result.ok) return result.response;
  return result.transport.handleRequest(req);
}

export async function GET(req: Request): Promise<Response> {
  const result = await authenticateAndBuildTransport(req);
  if (!result.ok) return result.response;
  return result.transport.handleRequest(req);
}

export async function DELETE(req: Request): Promise<Response> {
  const result = await authenticateAndBuildTransport(req);
  if (!result.ok) return result.response;
  return result.transport.handleRequest(req);
}
