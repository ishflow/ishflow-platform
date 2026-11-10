# Kaspi → ishflow sync recipe

Pulls NEW Kaspi Shop orders and creates one POSTED sales invoice per order
via the ishflow public API.

## Quick start

```bash
pnpm tsx scripts/integrations/kaspi/sync.ts --mock

ISHFLOW_API_KEY=1ca_live_… \
KASPI_API_TOKEN=… \
pnpm tsx scripts/integrations/kaspi/sync.ts
```

## Env vars

| Name               | Required          | Default                            | Notes                                                  |
|--------------------|-------------------|------------------------------------|--------------------------------------------------------|
| `ISHFLOW_API_KEY`  | yes (live mode)   | —                                  | write-scope key from `/admin/api-keys`                 |
| `ISHFLOW_BASE_URL` | no                | `https://app.example.com`      | override for self-host or staging                      |
| `KASPI_API_TOKEN`  | yes (live mode)   | —                                  | from Kaspi Shop → API tokens                           |

## How it works

1. `loadOrders` reads either `mock-payload.json` (when `--mock`) or
   `GET https://kaspi.kz/shop/api/v2/orders?filter[orders][state]=NEW`.
2. `parseOrder` normalises the Kaspi shape into
   `{ externalId, date, customer, lines[] }`. Customer name = `firstName +
   lastName`. **Per-unit price is derived from `totalPrice / quantity`** —
   Kaspi ships line totals, not unit prices.
3. For each order:
   - Skip if `id` already in `.ishflow-sync-state.json`.
   - Find customer by email (preferred) or name; create if missing.
   - Resolve each product by Kaspi offer code against ishflow's `code`
     field — script aborts the order if any code is missing.
   - `POST /api/v1/invoices` with the resolved customer + lines; the API
     auto-posts and returns the POSTED doc.
   - Record `{externalId → invoiceId}` in the ledger.
4. Exit 0 if every order succeeded, 1 if any failed.

## Customising

- Switch order state filter (e.g. `APPROVED_BY_BANK`) in `loadOrders`.
- If your Kaspi merchant returns prices in tiyin/kopecks, divide by 100 in
  `parseOrder`.
- Multiple warehouses? Pass `warehouseId` in `client.createInvoice(…)`.

## Troubleshooting

- **`Product not found in ishflow: code=…`** — create the product with the
  Kaspi offer code set on `code`, or change `resolveProductId` to fall back
  to `name`.
- **`forbidden`** — API key is read-scope. Mint a write-scope key.
- **`feature_locked`** — your plan doesn't include API access. Upgrade.
