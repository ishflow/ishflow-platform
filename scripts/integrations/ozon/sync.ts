#!/usr/bin/env tsx
/**
 * Ozon → ishflow sync recipe.
 *
 * Reads FBO postings from a payload (mock JSON file or live Ozon Seller API)
 * and creates one POSTED sales invoice per posting via the ishflow public
 * API.
 *
 * Run:
 *   pnpm tsx scripts/integrations/ozon/sync.ts --mock
 *   ISHFLOW_API_KEY=… OZON_CLIENT_ID=… OZON_API_KEY=… pnpm tsx scripts/integrations/ozon/sync.ts
 *
 * Env vars:
 *   ISHFLOW_API_KEY    — your ishflow write-scope API key
 *   ISHFLOW_BASE_URL   — override the API base URL (default https://ishflow.com)
 *   OZON_CLIENT_ID     — Ozon Seller API client id (live mode)
 *   OZON_API_KEY       — Ozon Seller API key      (live mode)
 *
 * Idempotency: `.ishflow-sync-state.json` records already-synced postings.
 * Returns exit code 0 on full success, 1 if any posting failed.
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
const SCRIPT_NAME = 'ozon';

type OzonPosting = {
  posting_number: string;
  in_process_at: string;
  customer: { name: string; phone?: string; email?: string };
  products: Array<{ sku: string; name: string; quantity: number; price: string }>;
};

type OzonPayload = { result: { postings: OzonPosting[] } };

type NormalizedLine = { sku: string; name: string; quantity: number; unitPrice: number };
type NormalizedOrder = {
  externalId: string;
  date: string;
  customer: { name: string; email?: string; phone?: string };
  lines: NormalizedLine[];
};

export function parseOrder(raw: OzonPosting): NormalizedOrder {
  return {
    externalId: raw.posting_number,
    date: raw.in_process_at,
    customer: {
      name: raw.customer.name,
      email: raw.customer.email,
      phone: raw.customer.phone,
    },
    lines: raw.products.map((p) => ({
      sku: p.sku,
      name: p.name,
      quantity: p.quantity,
      // Ozon returns prices as decimal strings.
      unitPrice: Number(p.price),
    })),
  };
}

async function loadOrders(args: Args): Promise<NormalizedOrder[]> {
  if (args.mock) {
    const path = resolve(HERE, 'mock-payload.json');
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as OzonPayload;
    return raw.result.postings.map(parseOrder);
  }
  // Live mode: call Ozon Seller API. Adjust filter / pagination to your needs.
  const clientId = process.env.OZON_CLIENT_ID;
  const apiKey = process.env.OZON_API_KEY;
  if (!clientId || !apiKey) {
    throw new Error('OZON_CLIENT_ID and OZON_API_KEY env vars required in live mode');
  }
  const url = 'https://api-seller.ozon.ru/v3/posting/fbo/list';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dir: 'ASC',
      filter: { status: 'awaiting_deliver' },
      limit: 100,
      offset: 0,
    }),
  });
  if (!res.ok) throw new Error(`Ozon API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as OzonPayload;
  return json.result.postings.map(parseOrder);
}

async function resolveProductId(client: IshflowClient, line: NormalizedLine): Promise<string> {
  // Ozon products use SKU → exact-match against `code`.
  const found = await client.findProduct({ code: line.sku });
  if (!found.ok) throw new Error(`findProduct failed: ${found.error.message}`);
  if (found.data.length === 0) {
    throw new Error(
      `Product not found in ishflow: sku=${line.sku}, name=${line.name}. Create the product manually in Catalog → Products with code=sku before syncing.`,
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
    `[${SCRIPT_NAME}] loaded ${orders.length} postings (${args.mock ? 'mock' : 'live'} mode)`,
  );

  if (args.mock) {
    console.info(`[${SCRIPT_NAME}] mock mode: would sync the following postings:`);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
