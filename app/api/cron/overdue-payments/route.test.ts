import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());
const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({ withBypass: mockWithBypass }));
vi.mock('@/platform/notifications/dispatch-overdue-payment', () => ({
  dispatchOverduePayment: mockDispatch,
}));
// Telemetry is a passthrough here — its own DB behaviour is covered by
// platform/super-admin/system/record-cron-run.test.ts.
vi.mock('@/platform/super-admin/system/record-cron-run', () => ({
  recordCronRun: (_name: string, fn: () => unknown) => fn(),
}));

process.env.CRON_SECRET = 'test-cron-secret';
const { POST } = await import('./route');

function makeReq(authHeader?: string): Request {
  return new Request('http://localhost/api/cron/overdue-payments', {
    method: 'POST',
    headers: authHeader === undefined ? {} : { authorization: authHeader },
  });
}

describe('POST /api/cron/overdue-payments', () => {
  beforeEach(() => {
    mockWithBypass.mockReset();
    mockDispatch.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('returns 401 when Authorization header is missing', async () => {
    expect((await POST(makeReq())).status).toBe(401);
  });

  it('returns 401 when bearer token is wrong', async () => {
    expect((await POST(makeReq('Bearer wrong'))).status).toBe(401);
  });

  it('aggregates dispatcher emails per tenant', async () => {
    mockWithBypass.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    mockDispatch.mockResolvedValueOnce({ emails: 2 }).mockResolvedValueOnce({ emails: 0 });
    const res = await POST(makeReq('Bearer test-cron-secret'));
    expect(await res.json()).toEqual({ tenants: 2, emails: 2 });
  });

  it('swallows per-tenant errors', async () => {
    mockWithBypass.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    mockDispatch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ emails: 1 });
    expect(await (await POST(makeReq('Bearer test-cron-secret'))).json()).toEqual({
      tenants: 2,
      emails: 1,
    });
  });
});
