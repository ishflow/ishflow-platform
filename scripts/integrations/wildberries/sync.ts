#!/usr/bin/env tsx
/**
 * Wildberries → ishflow sync recipe.
 *
 * Reads orders from a payload (mock JSON file or live Wildberries API),
 * normalises them, and creates one POSTED sales invoice per order via the
 * ishflow public API.
 *
 * Run:
 *   pnpm tsx scripts/integrations/wildberries/sync.ts --mock
 *   ISHFLOW_API_KEY=… WILDBERRIES_API_KEY=… pnpm tsx scripts/integrations/wildberries/sync.ts
 *
 * Env vars:
 *   ISHFLOW_API_KEY        — your ishflow write-scope API key
 *   ISHFLOW_BASE_URL       — override the API base URL (default https://ishflow.com)
 *   WILDBERRIES_API_KEY    — your Wildberries Supplier API key (only required in live mode)
 *
 * Idempotency: `.ishflow-sync-state.json` next to this script records
 * already-synced orders so cron reruns don't double-post.
 *
 * Returns exit code 0 on full success, 1 if any order failed.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IdempotencyLedger,
  type IshflowClient,
  createIshflowClient,
  findOrCreateCustomer,
  ledgerPathFor,
} from '../_lib/ishflow-client';

const HERE = dirname(fileURLToPath(import.meta.url));

type WildberriesOrder = {
  id: string;
  createdAt: string;
  buyer: { fullName: string; phone?: string; email?: string };
  items: Array<{ barcode: string; name: string; quantity: number; price: number }>;
};

type WildberriesPayload = { orders: WildberriesOrder[] };

type NormalizedLine = { barcode: string; name: string; quantity: number; unitPrice: number };
type NormalizedOrder = {
  externalId: string;
  date: string;
  customer: { name: string; email?: string; phone?: string };
  lines: NormalizedLine[];
};

const SCRIPT_NAME = 'wildberries';

export function parseOrder(raw: WildberriesOrder): NormalizedOrder {
  return {
    externalId: raw.id,
    date: raw.createdAt,
    customer: {
      name: raw.buyer.fullName,
      email: raw.buyer.email,
      phone: raw.buyer.phone,
    },
    lines: raw.items.map((i) => ({
      barcode: i.barcode,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
    })),
  };
}

async function loadOrders(args: Args): Promise<NormalizedOrder[]> {
  if (args.mock) {
    const path = resolve(HERE, 'mock-payload.json');
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as WildberriesPayload;
    return raw.orders.map(parseOrder);
  }
  // Live mode: call Wildberries Supplier API. Endpoint is illustrative —
  // wire your own auth + pagination here. The script intentionally stops at
  // a single page; customise to your needs.
  const wbKey = process.env.WILDBERRIES_API_KEY;
  if (!wbKey) throw new Error('WILDBERRIES_API_KEY env var required in live mode');
  const url = 'https://suppliers-api.wildberries.ru/api/v3/orders?limit=100';
  const res = await fetch(url, { headers: { Authorization: wbKey } });
  if (!res.ok) throw new Error(`Wildberries API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as WildberriesPayload;
  return json.orders.map(parseOrder);
}

async function resolveProductId(client: IshflowClient, line: NormalizedLine): Promise<string> {
  const found = await client.findProduct({ barcode: line.barcode });
  if (!found.ok) throw new Error(`findProduct failed: ${found.error.message}`);
  if (found.data.length === 0) {
    throw new Error(
      `Product not found in ishflow: barcode=${line.barcode}, name=${line.name}. Create the product manually in Catalog → Products before syncing.`,
    );
  }
  return (found.data[0] as { id: string }).id;
}

async function syncOne(
  client: IshflowClient,
  ledger: IdempotencyLedger,
  order: NormalizedOrder,
): Promise<'synced' | 'skipped'> {
  if (ledger.has(order.externalId)) {
    console.info(`[${SCRIPT_NAME}] skip ${order.externalId} (already synced)`);
    return 'skipped';
  }
  const { id: customerId } = await findOrCreateCustomer(client, order.customer, {
    externalRef: `${SCRIPT_NAME}-${order.externalId}`,
  });
  const resolvedLines = await Promise.all(
    order.lines.map(async (l) => ({
      productId: await resolveProductId(client, l),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
  );
  const invoice = await client.createInvoice({
    customerId,
    date: order.date,
    lines: resolvedLines,
  });
  if (!invoice.ok) throw new Error(`createInvoice failed: ${invoice.error.message}`);
  ledger.record(order.externalId, invoice.data.id);
  console.info(`[${SCRIPT_NAME}] OK   ${order.externalId} → invoice ${invoice.data.id}`);
  return 'synced';
}

type Args = { mock: boolean };

function parseArgs(argv: string[]): Args {
  return { mock: argv.includes('--mock') };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const apiKey = args.mock ? '1ca_live_mock' : process.env.ISHFLOW_API_KEY;
  if (!apiKey) {
    console.error('ISHFLOW_API_KEY env var required (or pass --mock)');
    return 1;
  }
  const client = createIshflowClient({
    apiKey,
    baseUrl: process.env.ISHFLOW_BASE_URL,
  });
  const ledger = new IdempotencyLedger(ledgerPathFor(import.meta.url));

  const orders = await loadOrders(args);
  console.info(
    `[${SCRIPT_NAME}] loaded ${orders.length} orders (${args.mock ? 'mock' : 'live'} mode)`,
  );

  if (args.mock) {
    // In mock mode we don't hit the ishflow API — just demonstrate the flow.
    console.info(`[${SCRIPT_NAME}] mock mode: would sync the following orders:`);
    for (const o of orders) {
      console.info(`  - ${o.externalId} → ${o.customer.name} (${o.lines.length} lines)`);
    }
    console.info(`[${SCRIPT_NAME}] mock run complete. Synced 0 invoices (dry).`);
    return 0;
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  for (const order of orders) {
    try {
      const outcome = await syncOne(client, ledger, order);
      if (outcome === 'synced') synced++;
      else skipped++;
    } catch (err) {
      failed++;
      console.error(`[${SCRIPT_NAME}] FAIL ${order.externalId}: ${(err as Error).message}`);
    }
  }
  console.info(`[${SCRIPT_NAME}] Synced ${synced} invoices, skipped ${skipped}, failed ${failed}.`);
  return failed === 0 ? 0 : 1;
}

// Only run main() when this file is executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
