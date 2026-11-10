# @ishflow/mcp-tools

ishflow's Model Context Protocol (MCP) server — lets LLM agents read, mutate, and observe
ishflow tenant + platform data through a single typed HTTP endpoint.

**Status:** Phase 1, local-only. Not yet deployed to production. Tracking branch:
`feat/mcp-server`.

---

## 1. What this is

ishflow exposes its metadata-driven engine (catalogs, documents, registers, reports,
super-admin tenant ops) as an MCP server reachable at **`POST /api/mcp`** on any
ishflow web instance. The server speaks the MCP **streamable HTTP** transport, runs
stateless (no per-session memory between requests), and authenticates every call with
a Bearer token that maps to an existing `ApiKey` row.

Tools are **polymorphic**: rather than one tool per catalog or document, the server
ships generic ops (`catalog_list`, `catalog_create`, `document_post`, `register_balance`,
`report_run`, etc.) that take a `configId` and dispatch into the same engine the web UI
uses. Super-admin tools (`tenant_*`, `user_*`, `system_*`, `audit_*`) are hand-written
wrappers around the same `platform/super-admin/*` helpers the SA console calls.

Every mutating call writes an audit row tagged `source: 'mcp'` so MCP-driven changes are
distinguishable from web/API/CLI changes.

---

## 2. Quickstart

### Step 1 — Mint an API key

**Tenant-scoped key** (for `catalog_*` / `document_*` / `register_*` / `report_*`):

Use the in-app UI at `/v2/admin/api-keys` once it lands. Until then, mint via the
provisioning script (see Phase 2 follow-ups).

**Platform-admin key** (for `tenant_*` / `user_*` / `system_*` / `audit_*` /
`billing_*` / `support_*`):

```bash
# 1. Add your Clerk user id to the allow-list in .env.local first:
#    SUPER_ADMIN_CLERK_USER_IDS=user_xxx,user_yyy
# 2. Then mint the key:
# Use your own script that calls the API-key service (the maintainers' local helper is not part of this repo):
#   user-id <user-uuid>, tenant-id <tenant-uuid>, name "Local MCP key"
```

The helper prints the raw `1ca_live_…` key **once**. Only the bcrypt hash is stored.
Re-mint if you lose it.

### Step 2 — Smoke-test the connection

```bash
MCP_KEY=1ca_live_... \
MCP_URL=http://localhost:3100/api/mcp \
  <your MCP client of choice>
```

Add `MCP_PLATFORM_KEY=1ca_live_…` to exercise the super-admin surface too. Expected
output: `N passed, 0 failed`.

### Step 3 — Wire to an MCP client

See **§3 Client configs** below.

---

## 3. Client configs

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "ishflow": {
      "url": "http://localhost:3100/api/mcp",
      "headers": {
        "Authorization": "Bearer 1ca_live_..."
      }
    }
  }
}
```

For production, replace the URL with `https://ishflow.com/api/mcp` and use a key minted
for the prod tenant.

### OpenCloud Agent

OpenCloud's MCP integration takes the same shape — an HTTPS endpoint plus a Bearer
header. Configure in OpenCloud's agent settings (refer to OpenCloud's MCP docs for the
exact YAML/JSON path on your installation):

```yaml
mcp:
  ishflow:
    transport: http
    url: https://ishflow.com/api/mcp
    headers:
      Authorization: Bearer 1ca_live_...
```

### Hermes Agent

Same Bearer pattern. Follow Hermes' MCP server configuration guide for the exact
config-file location on your machine.

---

## 4. Tool catalog

The server registers **54 tools** total (**47 wired**, **7 deferred to Phase 2**).
The live list is always discoverable via the JSON-RPC `tools/list` method.

| Group        | Tools                                                                          | Scope            | Wired / Deferred |
| ------------ | ------------------------------------------------------------------------------ | ---------------- | ---------------- |
| `ping`       | `ping`                                                                         | `read`           | 1 / 0            |
| `catalog_*`  | `list`, `get`, `create`, `update`, `archive`                                   | `read` / `write` | 5 / 0            |
| `document_*` | `list`, `get`, `create`, `post`, `unpost`, `clone`                             | `read` / `write` | 6 / 0            |
| `register_*` | `balance`, `turnover`, `movements`                                             | `read`           | 3 / 0            |
| `report_*`   | `list`, `run`                                                                  | `read`           | 2 / 0            |
| `tenant_*`   | `list`, `get`, `suspend`, `lift_suspension`, `archive`, `transfer_ownership`,  | `platform_admin` | 12 / 0           |
|              | `wipe_data`, `hard_delete`, `add_note`, `set_tag`, `set_override`,             |                  |                  |
|              | `change_subscription`                                                          |                  |                  |
| `user_*`     | `list`, `get`, `soft_delete`, `impersonate_token` (+ `request_password_reset`, | `platform_admin` | 4 / 2            |
|              | `revoke_all_sessions` deferred)                                                |                  |                  |
| `system_*`   | `env_status`, `db_stats`, `deploy_info`, `cron_runs`, `platform_setting_get`,  | `platform_admin` | 8 / 0            |
|              | `platform_setting_set`, `maintenance_mode`, `api_key_revoke`                   |                  |                  |
| `audit_*`    | `search`, `get`                                                                | `platform_admin` | 2 / 0            |
| `billing_*`  | `revenue_snapshot`, `manual_plan_change` (+ `events_list` deferred)            | `platform_admin` | 2 / 1            |
| `support_*`  | `ticket_list`, `ticket_get` (+ `ticket_assign_to_me`, `ticket_close`,          | `platform_admin` | 2 / 3            |
|              | `ticket_link_tenant` deferred)                                                 |                  |                  |
| `demo_*`     | (`seed_tenant` deferred)                                                       | `platform_admin` | 0 / 1            |

Deferred tools register normally and fail with `precondition_failed` and a Phase 2
hint when invoked. They're listed so an LLM can plan around them without trial-and-error.

---

## 5. Error envelope

Errors come back as MCP `isError: true` tool results whose first content text is a JSON
envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "configId is required",
    "details": { "field": "configId" }
  }
}
```

### Error codes

| Code                  | Meaning                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `unauthorized`        | Missing / invalid Bearer token, or key revoked.                          |
| `forbidden`           | Caller's scope is below the tool's `requiredScope`.                      |
| `not_found`           | Unknown tool name, or referenced row id does not exist.                  |
| `validation_error`    | Input failed the tool's Zod schema.                                      |
| `conflict`            | Optimistic-lock or unique-constraint violation.                          |
| `precondition_failed` | Tool wired but a business rule blocks the call (incl. deferred tools).   |
| `rate_limited`        | Reserved for Phase 2; not currently emitted.                             |
| `internal_error`      | Unhandled exception. Includes a correlationId.                           |
| `tenant_required`     | Tenant-scoped tool called without a tenant context resolvable from key.  |

### i18n

Send `Accept-Language: ru | en | tr` on the HTTP request to localise error messages.
Other locales fall back to `en`. The error `code` is always the canonical English token
above — only the `message` is translated.

---

## 6. Audit trail

Every mutating tool emits one audit row:

- **Tenant-scoped tools** (`catalog_*` writes, `document_*` writes) write to
  `AuditLog` via the engine's own audit middleware. The row carries `source: 'mcp'`.
- **Super-admin tools** (`tenant_*`, `user_*`, `system_*`, `support_*`, `billing_*`)
  write to `PlatformAuditLog`. The action column is prefixed with the channel:
  - Engine-native actions like `tenant.suspended` are still emitted by the underlying
    helper (`source: 'mcp'`).
  - When an SA tool needs its own channel marker, it writes a sibling row with action
    `mcp.<tool_name>` for forensic separation.
- Every row carries the per-request `correlationId` (set by the route handler before
  dispatch) in its JSON metadata, so a single MCP call can be traced across both audit
  tables.

---

## 7. Local development

```bash
pnpm generate:mcp                              # regenerate catalog/document/register/report tools
pnpm vitest run packages/mcp-tools             # run the package test suite
pnpm lint:mcp                                  # withBypass ban check (must show 0 hits)
```

Useful files:

- `src/server.ts` — tool registry + `dispatchTool` + `createMcpServer`.
- `src/error-map.ts` — typed `ToolError` class + `mapErrorToToolResult`.
- `src/i18n.ts` + `messages/<locale>.json` — error-message catalogs.
- `src/zod-to-json-schema.ts` — schema translator used by `tools/list`.
- `src/generated/*-tools.ts` — codegen output (do not edit by hand).
- `src/super-admin/*.ts` — hand-written platform_admin tools.
- `scripts/check-no-bypass.mjs` — `pnpm lint:mcp` implementation.

The HTTP route lives in `app/api/mcp/route.ts` (outside this package) — it does Bearer
auth, locale resolution, and correlationId minting, then hands off to
`createMcpServer(ctx)`.

---

## 8. Deferred to Phase 2

The 7 deferred tools listed in §4 unblock when their upstream helpers land:

| Tool                                     | Blocker                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `user_request_password_reset`            | Extract Clerk admin helpers from `use server` action into `platform/`. |
| `user_revoke_all_sessions`               | Same Clerk-helper extraction as above.                                 |
| `user_impersonate_token` (TTL portion)   | `ApiKey.expiresAt` column.                                             |
| `support_ticket_assign_to_me`            | `assignSupportTicket` helper under `platform/super-admin/`.            |
| `support_ticket_close`                   | `closeSupportTicket` helper under `platform/super-admin/`.             |
| `support_ticket_link_tenant`             | `linkSupportTicketTenant` helper under `platform/super-admin/`.        |
| `billing_events_list`                    | `listBillingEventsAcrossTenants` helper (cross-tenant `withBypass`).   |
| `demo_seed_tenant`                       | Leaf-importable demo seed module.                                      |

Other Phase 2 items not yet promised as tools:

- Switch `report_*` from the hand-curated config map to a `defineReportView` registry
  walk (once the DSL lands).
- Streaming responses (SSE) for long-running `report_run` calls.
- OAuth 2.1 flow for delegated tokens (current model: pre-minted Bearer keys).
- Per-tool rate limiting + quota accounting (`rate_limited` code is reserved for this).
- OpenAPI / OpenRPC export of the tool catalog for non-MCP consumers.

