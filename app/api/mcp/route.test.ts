import { describe, expect, it } from 'vitest';
import { POST } from './route';

function rpcRequest(method: string, params: unknown = {}, apiKey?: string): Request {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

describe('POST /api/mcp — auth gate', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await POST(rpcRequest('tools/list'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('unauthorized');
  });

  it('returns 401 invalid_api_key with a malformed Bearer token', async () => {
    const res = await POST(rpcRequest('tools/list', {}, 'totally-invalid'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('invalid_api_key');
  });
  // Happy-path tests with a real key live in the end-to-end smoke script (not included in this repo).
});
