import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));
// Telemetry is a passthrough here — its own DB behaviour is covered by
// platform/super-admin/system/record-cron-run.test.ts.
vi.mock('@/platform/super-admin/system/record-cron-run', () => ({
  recordCronRun: (_name: string, fn: () => unknown) => fn(),
}));

process.env.CRON_SECRET = 'test-cron-secret';

const { POST } = await import('./route');

function makeReq(authHeader?: string): Request {
  return new Request('http://localhost/api/cron/trial-expiry', {
    method: 'POST',
    headers: authHeader === undefined ? {} : { authorization: authHeader },
  });
}

describe('POST /api/cron/trial-expiry', () => {
  beforeEach(() => {
    mockWithBypass.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockWithBypass).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer token is wrong', async () => {
    const res = await POST(makeReq('Bearer wrong-token'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockWithBypass).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET env is missing', async () => {
    vi.stubEnv('CRON_SECRET', '');
    try {
      const res = await POST(makeReq('Bearer test-cron-secret'));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'unauthorized' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
