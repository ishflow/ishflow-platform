import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPushToExpoTokens } from './push';

describe('sendPushToExpoTokens', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns early when tokens array is empty', async () => {
    const r = await sendPushToExpoTokens([], { title: 't', body: 'b' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('POSTs to Expo Push with chunked messages', async () => {
    const tokens = ['ExponentPushToken[a]', 'ExponentPushToken[b]'];
    await sendPushToExpoTokens(tokens, {
      title: 'Sales invoice posted',
      body: 'INV-001',
      data: { event: 'sales.invoice.posted', docId: 'abc' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error('fetchMock not called');
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as Array<{
      to: string;
      title: string;
      body: string;
      sound: string;
      data: Record<string, unknown>;
    }>;
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      to: 'ExponentPushToken[a]',
      title: 'Sales invoice posted',
      body: 'INV-001',
      sound: 'default',
      data: { event: 'sales.invoice.posted', docId: 'abc' },
    });
  });

  it('reports ok when every Expo ticket succeeds', async () => {
    const r = await sendPushToExpoTokens(['ExponentPushToken[a]'], { title: 't', body: 'b' });
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('reports failure when Expo returns an error ticket (e.g. dead token)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
        ],
      }),
    });
    const r = await sendPushToExpoTokens(['ExponentPushToken[x]'], { title: 't', body: 'b' });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(['DeviceNotRegistered']);
  });

  it('reports failure on a non-2xx HTTP response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, text: async () => 'bad gateway' });
    const r = await sendPushToExpoTokens(['ExponentPushToken[x]'], { title: 't', body: 'b' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/HTTP 502/);
  });

  it('returns ok:false on a fetch error and never throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const r = await sendPushToExpoTokens(['ExponentPushToken[x]'], { title: 't', body: 'b' });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(['network down']);
  });
});
