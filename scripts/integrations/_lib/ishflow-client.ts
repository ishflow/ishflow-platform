/**
 * Shared client for ishflow public API recipes.
 *
 * Usage:
 *   const client = createIshflowClient({ apiKey: process.env.ISHFLOW_API_KEY! });
 *   const me = await client.me();
 *   if (!me.ok) throw new Error(me.error.message);
 *
 * Methods return `Result<T> = { ok: true, data } | { ok: false, error }` so
 * callers can branch without try/catch. Network/protocol errors map to
 * `{ ok: false, error: { code, message, status? } }` consistent with the
 * `/api/v1` envelope.
 *
 * Retry policy: 3 attempts on 5xx + 429 with exponential backoff (250/500/1000ms
 * + ±50% jitter). 4xx aborts immediately — these are caller bugs that retry
 * won't fix.
 *
 * Idempotency: the `IdempotencyLedger` class persists `{marketplaceOrderId ->
 * invoiceId}` to a JSON file next to the calling script so cron reruns skip
 * already-synced orders. The public `/api/v1/invoices` POST does not yet
 * persist `externalId` server-side; the ledger is the client-side guarantee.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ApiError = {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type IshflowClientOptions = {
  apiKey: string;
  baseUrl?: string;
  /** Override the global fetch (for tests). */
  fetchImpl?: typeof fetch;
  /** Override the sleep helper (for tests). */
  sleep?: (ms: number) => Promise<void>;
};

export type CustomerInput = {
  name: string;
  email?: string;
  phone?: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type Product = {
  id: string;
  name: string;
  code: string | null;
  barcode: string | null;
};

export type InvoiceLineInput = {
  productId: string;
  quantity: number;
  unitPrice?: number;
};

export type CreateInvoiceInput = {
  customerId: string;
  warehouseId?: string;
  date?: string;
  lines: InvoiceLineInput[];
};

export type Invoice = {
  id: string;
  status: 'SAVED' | 'POSTED';
  date: string;
  customer: string;
  warehouse: string;
  lines: Array<{ product: string; quantity: number; price: number }>;
};

const DEFAULT_BASE_URL = 'https://ishflow.com';
const RETRY_DELAYS_MS = [250, 500, 1000];

export function createIshflowClient(opts: IshflowClientOptions) {
  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  if (!opts.apiKey) {
    throw new Error('ISHFLOW_API_KEY is required (set env var or pass --mock)');
  }

  async function request<T>(
    path: string,
    init: {
      method?: 'GET' | 'POST';
      body?: unknown;
      query?: Record<string, string | undefined>;
    } = {},
  ): Promise<Result<T>> {
    const qs = init.query
      ? `?${Object.entries(init.query)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')}`
      : '';
    const url = `${baseUrl}${path}${qs}`;
    const method = init.method ?? 'GET';

    let lastError: ApiError = { code: 'unknown', message: 'no attempts made' };
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      let res: Response;
      try {
        res = await fetchImpl(url, {
          method,
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        });
      } catch (err) {
        lastError = {
          code: 'network_error',
          message: err instanceof Error ? err.message : String(err),
        };
        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(jitter(RETRY_DELAYS_MS[attempt] as number));
          continue;
        }
        break;
      }

      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as { data: T };
        return { ok: true, data: json.data };
      }

      const errBody = (await res.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string; details?: Record<string, unknown> };
      };
      lastError = {
        code: errBody.error?.code ?? `http_${res.status}`,
        message: errBody.error?.message ?? res.statusText,
        status: res.status,
        details: errBody.error?.details,
      };

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < RETRY_DELAYS_MS.length) {
        await sleep(jitter(RETRY_DELAYS_MS[attempt] as number));
        continue;
      }
      break;
    }
    return { ok: false, error: lastError };
  }

  return {
    me: () => request<{ tenantId: string | null; scope: 'read' | 'write' }>('/api/v1/me'),

    /**
     * Find customers by exact email / phone / fuzzy name search. The public
     * `/api/v1/customers` endpoint accepts dedicated `email=` and `phone=`
     * exact-match filters; `search=` falls back to fuzzy matching on the
     * customer name. Pass exactly one of `email`, `phone`, or `name`.
     */
    async findCustomer(query: {
      email?: string;
      phone?: string;
      name?: string;
    }): Promise<Result<Customer[]>> {
      const q: Record<string, string | undefined> = {};
      if (query.email) q.email = query.email;
      else if (query.phone) q.phone = query.phone;
      else if (query.name) q.search = query.name;
      else {
        return {
          ok: false,
          error: { code: 'validation_error', message: 'email, phone, or name required' },
        };
      }
      return request<Customer[]>('/api/v1/customers', { query: q });
    },

    createCustomer: (input: CustomerInput) =>
      request<Customer>('/api/v1/customers', { method: 'POST', body: input }),

    /**
     * Find products by exact barcode / exact code / fuzzy name search. The
     * public `/api/v1/products` endpoint accepts dedicated `barcode=` and
     * `code=` exact-match filters; `search=` falls back to fuzzy product-name
     * matching. Pass exactly one identifier.
     */
    async findProduct(query: {
      barcode?: string;
      code?: string;
      name?: string;
    }): Promise<Result<Product[]>> {
      const q: Record<string, string | undefined> = {};
      if (query.barcode) q.barcode = query.barcode;
      else if (query.code) q.code = query.code;
      else if (query.name) q.search = query.name;
      else {
        return {
          ok: false,
          error: { code: 'validation_error', message: 'barcode, code, or name required' },
        };
      }
      return request<Product[]>('/api/v1/products', { query: q });
    },

    createInvoice: (input: CreateInvoiceInput) =>
      request<Invoice>('/api/v1/invoices', { method: 'POST', body: input }),
  };
}

/**
 * Look up a customer by email → phone → name (in that order), creating a new
 * row if no match is found. Returns the customer id.
 *
 * Strategy:
 *   1. Email present → exact-match lookup. Hit = use; miss = create with the
 *      buyer's clean name + email/phone.
 *   2. No email, phone present → exact-match on phone. Same.
 *   3. Neither → create a uniquely-suffixed name (`<name> · <externalRef>`)
 *      so multiple anonymous buyers with the same display name don't collide
 *      on the catalog's `name` unique constraint.
 *
 * The platform recipes (Wildberries / Ozon / Kaspi) all share this flow —
 * keeping it in the client avoids three near-identical copies in each
 * `sync.ts`.
 */
export async function findOrCreateCustomer(
  client: IshflowClient,
  input: { name: string; email?: string; phone?: string },
  opts: { externalRef: string },
): Promise<{ id: string; created: boolean }> {
  if (input.email) {
    const found = await client.findCustomer({ email: input.email });
    if (!found.ok) throw new Error(`findCustomer(email) failed: ${found.error.message}`);
    if (found.data.length > 0) return { id: (found.data[0] as { id: string }).id, created: false };
  } else if (input.phone) {
    const found = await client.findCustomer({ phone: input.phone });
    if (!found.ok) throw new Error(`findCustomer(phone) failed: ${found.error.message}`);
    if (found.data.length > 0) return { id: (found.data[0] as { id: string }).id, created: false };
  }

  const hasContact = Boolean(input.email || input.phone);
  // No contact info → suffix the name to dodge the catalog's `name` unique
  // constraint when multiple anonymous buyers share a display name.
  const createName = hasContact ? input.name : `${input.name} · ${opts.externalRef}`;
  const created = await client.createCustomer({
    name: createName,
    email: input.email,
    phone: input.phone,
  });
  if (!created.ok) {
    throw new Error(`createCustomer failed: ${created.error.message}`);
  }
  return { id: created.data.id, created: true };
}

export type IshflowClient = ReturnType<typeof createIshflowClient>;

/**
 * JSON-file ledger that survives cron reruns. Maps marketplace order id to the
 * ishflow invoice id so we skip already-synced orders. File lives next to the
 * caller's script (so each platform has its own state).
 */
export class IdempotencyLedger {
  private state: Record<string, { invoiceId: string; syncedAt: string }> = {};

  constructor(public readonly filePath: string) {
    if (existsSync(filePath)) {
      try {
        this.state = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch {
        this.state = {};
      }
    }
  }

  has(orderId: string): boolean {
    return Object.hasOwn(this.state, orderId);
  }

  record(orderId: string, invoiceId: string): void {
    this.state[orderId] = { invoiceId, syncedAt: new Date().toISOString() };
    writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  size(): number {
    return Object.keys(this.state).length;
  }
}

export function ledgerPathFor(scriptUrl: string): string {
  const dir = dirname(fileURLToPath(scriptUrl));
  return resolve(dir, '.ishflow-sync-state.json');
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(base: number): number {
  const delta = base * 0.5;
  return base + (Math.random() * 2 - 1) * delta;
}
