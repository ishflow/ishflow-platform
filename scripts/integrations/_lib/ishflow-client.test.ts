import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IdempotencyLedger, createIshflowClient, findOrCreateCustomer } from './ishflow-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createIshflowClient', () => {
  it('passes Bearer auth + JSON content type on requests', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { tenantId: 't1', scope: 'write' } }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.me();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(init.headers.Authorization).toBe('Bearer 1ca_live_abc');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('retries on 503 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'service_unavailable', message: 'down' } }, 503),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { tenantId: 't1', scope: 'write' } }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: () => Promise.resolve(),
    });
    const res = await client.me();
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('aborts immediately on 400 — no retry', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'validation_error', message: 'bad input' } }, 400),
      );
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: () => Promise.resolve(),
    });
    const res = await client.me();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('validation_error');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses email= query param for findCustomer when email is set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.findCustomer({ email: 'a b@example.com' });
    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toContain('email=a%20b%40example.com');
    expect(url).not.toContain('search=');
  });

  it('uses phone= query param for findCustomer when phone is set (and no email)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.findCustomer({ phone: '+77001234567' });
    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toContain('phone=%2B77001234567');
    expect(url).not.toContain('email=');
  });

  it('falls back to search= when only name is provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.findCustomer({ name: 'Иван' });
    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toContain('search=');
    expect(url).not.toContain('email=');
  });

  it('uses barcode= query param for findProduct', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.findProduct({ barcode: '4607056030219' });
    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toContain('barcode=4607056030219');
    expect(url).not.toContain('search=');
  });

  it('uses code= query param for findProduct when only code is set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.findProduct({ code: 'SKU-42' });
    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toContain('code=SKU-42');
    expect(url).not.toContain('barcode=');
  });

  it('throws if apiKey is empty', () => {
    expect(() => createIshflowClient({ apiKey: '' })).toThrowError(/ISHFLOW_API_KEY/);
  });
});

describe('IdempotencyLedger', () => {
  let tmp: string;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('persists records across instances', () => {
    tmp = mkdtempSync(join(tmpdir(), 'ishflow-ledger-'));
    const filePath = join(tmp, 'state.json');
    const a = new IdempotencyLedger(filePath);
    expect(a.has('order-1')).toBe(false);
    a.record('order-1', 'inv-1');
    expect(a.size()).toBe(1);

    const b = new IdempotencyLedger(filePath);
    expect(b.has('order-1')).toBe(true);
  });

  it('returns false on missing file', () => {
    tmp = mkdtempSync(join(tmpdir(), 'ishflow-ledger-'));
    const filePath = join(tmp, 'never-existed.json');
    const a = new IdempotencyLedger(filePath);
    expect(a.size()).toBe(0);
    expect(a.has('anything')).toBe(false);
  });
});

describe('findOrCreateCustomer', () => {
  it('returns existing customer matched by email', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: [{ id: 'cust-1', name: 'Existing', email: 'a@b.com', phone: null }] }),
      );
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await findOrCreateCustomer(
      client,
      { name: 'New Name', email: 'a@b.com' },
      { externalRef: 'WB-1' },
    );
    expect(out).toEqual({ id: 'cust-1', created: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // only the find, no create
    expect(fetchImpl.mock.calls[0]?.[0]).toContain('email=a%40b.com');
  });

  it('creates a customer with the buyer name when email lookup misses', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { id: 'cust-2', name: 'Иван', email: 'i@v.com', phone: null } }, 201),
      );
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await findOrCreateCustomer(
      client,
      { name: 'Иван', email: 'i@v.com' },
      { externalRef: 'WB-2' },
    );
    expect(out.created).toBe(true);
    const createBody = JSON.parse((fetchImpl.mock.calls[1]?.[1] as { body: string }).body);
    expect(createBody.name).toBe('Иван'); // not suffixed — has email
    expect(createBody.email).toBe('i@v.com');
  });

  it('suffixes the name with externalRef when no email/phone is present', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { data: { id: 'cust-3', name: 'Anon · WB-3', email: null, phone: null } },
          201,
        ),
      );
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await findOrCreateCustomer(client, { name: 'Anon' }, { externalRef: 'WB-3' });
    expect(out.created).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // no find call when no email/phone
    const createBody = JSON.parse((fetchImpl.mock.calls[0]?.[1] as { body: string }).body);
    expect(createBody.name).toBe('Anon · WB-3');
  });

  it('looks up by phone when email is missing and phone is present', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [{ id: 'cust-4', name: 'PhoneMatch', email: null, phone: '+77001234567' }],
      }),
    );
    const client = createIshflowClient({
      apiKey: '1ca_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await findOrCreateCustomer(
      client,
      { name: 'Anyone', phone: '+77001234567' },
      { externalRef: 'KSP-1' },
    );
    expect(out).toEqual({ id: 'cust-4', created: false });
    expect(fetchImpl.mock.calls[0]?.[0]).toContain('phone=%2B77001234567');
  });
});
