#!/usr/bin/env tsx
/**
 * Kaspi → ishflow sync recipe.
 *
 * Reads orders from a payload (mock JSON file or live Kaspi Shop API) and
 * creates one POSTED sales invoice per order via the ishflow public API.
 *
 * Run:
 *   pnpm tsx scripts/integrations/kaspi/sync.ts --mock
 *   ISHFLOW_API_KEY=… KASPI_API_TOKEN=… pnpm tsx scripts/integrations/kaspi/sync.ts
 *
 * Env vars:
 *   ISHFLOW_API_KEY    — your ishflow write-scope API key
 *   ISHFLOW_BASE_URL   — override the API base URL (default https://ishflow.com)
 *   KASPI_API_TOKEN    — Kaspi Shop API token  (live mode)
 *
 * Idempotency: `.ishflow-sync-state.json` records already-synced orders.
 * Returns exit code 0 on full success, 1 if any order failed.
 *
 * Kaspi prices arrive as the line *total* (not per-unit) — we divide by
 * quantity to derive the per-unit price ishflow expects.
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
const SCRIPT_NAME = 'kaspi';

type KaspiOrder = {
  id: string;
  attributes: {
    createdDate: string;
    customer: { firstName: string; lastName: string; cellPhone?: string; email?: string };
    entries: Array<{
      offer: { code: string; name: string };
      quantity: number;
      totalPrice: number;
    }>;
  };
};

type KaspiPayload = { data: KaspiOrder[] };

type NormalizedLine = { code: string; name: string; quantity: number; unitPrice: number };
type NormalizedOrder = {
  externalId: string;
  date: string;
  customer: { name: string; email?: string; phone?: string };
  lines: NormalizedLine[];
};

export function parseOrder(raw: KaspiOrder): NormalizedOrder {
  const c = raw.attributes.customer;
  return {
    externalId: raw.id,
    date: raw.attributes.createdDate,
    customer: {
      name: [c.firstName, c.lastName].filter(Boolean).join(' '),
      email: c.email,
      phone: c.cellPhone,
    },
    lines: raw.attributes.entries.map((e) => ({
      code: e.offer.code,
      name: e.offer.name,
      quantity: e.quantity,
      // Kaspi totalPrice is the LINE total; per-unit = total / qty.
      unitPrice: e.quantity > 0 ? e.totalPrice / e.quantity : e.totalPrice,
    })),
  };
}

async function loadOrders(args: Args): Promise<NormalizedOrder[]> {
  if (args.mock) {
    const path = resolve(HERE, 'mock-payload.json');
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as KaspiPayload;
    return raw.data.map(parseOrder);
  }
  const token = process.env.KASPI_API_TOKEN;
  if (!token) throw new Error('KASPI_API_TOKEN env var required in live mode');
  // Filter for "NEW" orders — adjust to your workflow.
  const url = 'https://kaspi.kz/shop/api/v2/orders?filter[orders][state]=NEW&page[size]=100';
  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': token,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!res.ok) throw new Error(`Kaspi API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as KaspiPayload;
  return json.data.map(parseOrder);
}

async function resolveProductId(client: IshflowClient, line: NormalizedLine): Promise<string> {
  const found = await client.findProduct({ code: line.code });
  if (!found.ok) throw new Error(`findProduct failed: ${found.error.message}`);
  if (found.data.length === 0) {
    throw new Error(
      `Product not found in ishflow: code=${line.code}, name=${line.name}. Create the product manually in Catalog → Products with the Kaspi offer code before syncing.`,
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
