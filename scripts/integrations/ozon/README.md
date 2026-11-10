# Ozon → ishflow sync recipe

Pulls FBO postings from Ozon Seller and creates one POSTED sales invoice per
posting via the ishflow public API.

## Quick start

```bash
pnpm tsx scripts/integrations/ozon/sync.ts --mock

ISHFLOW_API_KEY=1ca_live_… \
OZON_CLIENT_ID=… \
OZON_API_KEY=… \
pnpm tsx scripts/integrations/ozon/sync.ts
```

## Env vars

| Name               | Required          | Default                            | Notes                                                  |
|--------------------|-------------------|------------------------------------|--------------------------------------------------------|
| `ISHFLOW_API_KEY`  | yes (live mode)   | —                                  | write-scope key from `/admin/api-keys`                 |
| `ISHFLOW_BASE_URL` | no                | `https://app.example.com`      | override for self-host or staging                      |
| `OZON_CLIENT_ID`   | yes (live mode)   | —                                  | from Ozon Seller → API keys                            |
| `OZON_API_KEY`     | yes (live mode)   | —                                  | from Ozon Seller → API keys                            |

## How it works

1. `loadOrders` reads either `mock-payload.json` (when `--mock`) or
   `POST https://api-seller.ozon.ru/v3/posting/fbo/list` with the `awaiting_deliver` filter.
2. `parseOrder` normalises the Ozon shape into
   `{ externalId, date, customer, lines[] }` (each line keeps the Ozon SKU).
3. For each posting:
   - Skip if `posting_number` already in `.ishflow-sync-state.json`.
   - Find customer by email (preferred) or name; create if missing.
   - Resolve each product by SKU against ishflow's `code` field — script
     aborts the posting if any SKU is missing.
   - `POST /api/v1/invoices` with the resolved customer + lines; the API auto-posts.
   - Record `{externalId → invoiceId}` in the ledger.
4. Exit 0 if every posting succeeded, 1 if any failed.

## Customising

- Filter to a different status by editing `filter.status` in `loadOrders`.
- Ozon ships prices as decimal strings (`"12990.00"`) — `parseOrder` already
  `Number()`-coerces them. Adjust if your account returns kopecks.
- Multiple warehouses? Pass `warehouseId` in `client.createInvoice(…)`.

## Troubleshooting

- **`Product not found in ishflow: sku=…`** — create the product with
  `code` set to the Ozon SKU, or change `resolveProductId` to fall back to
  `name`/`barcode`.
- **`forbidden`** — API key is read-scope. Mint a write-scope key.
- **`feature_locked`** — your plan doesn't include API access. Upgrade.
