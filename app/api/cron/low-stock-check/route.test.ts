import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());
const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({ withBypass: mockWithBypass }));
vi.mock('@/platform/notifications/dispatch-low-stock-alert', () => ({
  dispatchLowStockAlert: mockDispatch,
}));
// Telemetry is a passthrough here — its own DB behaviour is covered by
// platform/super-admin/system/record-cron-run.test.ts.
vi.mock('@/platform/super-admin/system/record-cron-run', () => ({
  recordCronRun: (_name: string, fn: () => unknown) => fn(),
}));

process.env.CRON_SECRET = 'test-cron-secret';
const { POST } = await import('./route');

function makeReq(authHeader?: string): Request {
  return new Request('http://localhost/api/cron/low-stock-check', {
    method: 'POST',
    headers: authHeader === undefined ? {} : { authorization: authHeader },
  });
}

describe('POST /api/cron/low-stock-check', () => {
  beforeEach(() => {
    mockWithBypass.mockReset();
    mockDispatch.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    expect(mockWithBypass).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer token is wrong', async () => {
    const res = await POST(makeReq('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('aggregates dispatcher emails per tenant', async () => {
    mockWithBypass.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    mockDispatch.mockResolvedValueOnce({ emails: 2 }).mockResolvedValueOnce({ emails: 1 });

    const res = await POST(makeReq('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tenants: 2, emails: 3 });
  });

  it('continues on per-tenant errors', async () => {
    mockWithBypass.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    mockDispatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ emails: 1 });

    const res = await POST(makeReq('Bearer test-cron-secret'));
    expect(await res.json()).toEqual({ tenants: 2, emails: 1 });
  });
});
