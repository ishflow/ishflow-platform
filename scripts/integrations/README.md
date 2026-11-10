# Marketplace Integration Recipes

Runnable starter scripts that pull marketplace orders and create POSTED sales
invoices in ishflow via the public REST API.

| Marketplace   | Script                                                         | Status  |
|---------------|----------------------------------------------------------------|---------|
| Wildberries   | [`wildberries/sync.ts`](./wildberries/README.md)               | Ready   |
| Ozon          | [`ozon/sync.ts`](./ozon/README.md)                             | Ready   |
| Kaspi         | [`kaspi/sync.ts`](./kaspi/README.md)                           | Ready   |

## How to use

1. **Mint a write-scope API key** at `/admin/api-keys` in your ishflow
   tenant. Copy it once — the plaintext is never shown again.
2. **Make sure your marketplace products exist in ishflow** with the
   matching identifier (barcode for Wildberries, SKU for Ozon, offer code
   for Kaspi). The scripts deliberately do not auto-create products.
3. **Dry-run** any script with `--mock` to validate the flow against the
   bundled sample payload — no network calls.
4. **Live run** with your marketplace credentials. See each platform's
   README for the exact env vars.

## Shared client

All three scripts use `_lib/ishflow-client.ts`, a thin fetch wrapper that:

- adds the `Authorization: Bearer <key>` header
- retries 3× on 5xx + 429 with exponential backoff
- returns `Result<T>` (success/error union) so you never need try/catch
- persists an idempotency ledger to `.ishflow-sync-state.json` next to each
  script so cron reruns skip already-synced orders

## Scheduling

Each script is a one-shot: read the next batch of orders, sync, exit. Wire
it into your own scheduler:

- GitHub Actions hourly workflow
- Vercel Cron job invoking a small wrapper deployment
- Plain `crontab` on a VPS
- Your existing CI/CD

The ledger file must persist between runs — bake it into your job artifact,
mount a volume, or commit it to a private repo.

## Patching for a new marketplace

Every script follows the same skeleton:

```
loadOrders() → parseOrder() → for each order:
  findOrCreateCustomer → resolveProductId → createInvoice → record ledger
```

To add a new marketplace, copy `kaspi/` to e.g. `etsy/`, rewrite
`parseOrder` for the new payload shape, and you're done.
