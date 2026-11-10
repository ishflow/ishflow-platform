# Wildberries → ishflow sync recipe

Pulls completed Wildberries orders and creates one POSTED sales invoice per
order via the ishflow public API.

## Quick start

```bash
# 1. Mint a write-scope API key at /admin/api-keys.
# 2. Make sure your Wildberries products exist in ishflow (barcode match is mandatory).
# 3. Dry-run with the bundled mock payload:
pnpm tsx scripts/integrations/wildberries/sync.ts --mock

# 4. Live run:
ISHFLOW_API_KEY=1ca_live_… \
WILDBERRIES_API_KEY=… \
pnpm tsx scripts/integrations/wildberries/sync.ts
```

## Env vars

| Name                    | Required          | Default                            | Notes                                                        |
|-------------------------|-------------------|------------------------------------|--------------------------------------------------------------|
| `ISHFLOW_API_KEY`       | yes (live mode)   | —                                  | write-scope key from `/admin/api-keys`                       |
| `ISHFLOW_BASE_URL`      | no                | `https://app.example.com`      | override for self-host or staging                            |
| `WILDBERRIES_API_KEY`   | yes (live mode)   | —                                  | Supplier API token, sent as `Authorization` header verbatim  |

## How it works

1. `loadOrders` reads either `mock-payload.json` (when `--mock`) or
   `GET https://suppliers-api.wildberries.ru/api/v3/orders?limit=100`.
2. `parseOrder` normalises the WB shape into
   `{ externalId, date, customer, lines[] }`.
3. For each order:
   - Skip if `externalId` already in `.ishflow-sync-state.json`.
   - Find customer by email (preferred) or name; create if missing.
   - Resolve each product by barcode — script aborts the order if any barcode is missing in ishflow.
   - `POST /api/v1/invoices` with the resolved customer + lines; the API auto-posts and returns the POSTED doc.
   - Record `{externalId → invoiceId}` in the ledger.
4. Exit 0 if every order succeeded, 1 if any failed.

## Scheduling

Run this from your own cron / GitHub Actions / Vercel Cron job. The ledger
file (`.ishflow-sync-state.json`) must persist between runs — commit it to a
private repo, mount a volume, or store it in your job's cache.

## Customising

- WB shape drifted? Update the `WildberriesOrder` type and the `parseOrder`
  function — the rest of the script is platform-agnostic.
- Want a price override? Edit `unitPrice` in `parseOrder` (e.g. drop it to
  let ishflow's price-type engine resolve the price).
- Multiple warehouses? Pass `warehouseId` in `client.createInvoice(…)`.

## Troubleshooting

- **`Product not found in ishflow: barcode=…`** — create the product
  (Catalog → Products) with that barcode, or change `resolveProductId` to
  match by `name` instead.
- **`forbidden`** — API key is read-scope. Mint a write-scope key.
- **`feature_locked`** — your plan doesn't include API access. Upgrade in
  Billing.
