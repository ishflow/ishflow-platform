import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as autoDeleteArchived } from './auto-delete-archived/route';
import { GET as idempotencyCleanup } from './idempotency-cleanup/route';

/**
 * Security regression test for the cron-secret auth guard.
 *
 * When `CRON_SECRET` is unset, a guard written as
 * `auth !== \`Bearer ${process.env.CRON_SECRET}\`` reduces to
 * `auth !== 'Bearer undefined'` — so an attacker sending the literal
 * `Authorization: Bearer undefined` passes the check and triggers the job.
 * `auto-delete-archived` HARD-DELETES tenants, so this must fail closed.
 *
 * These handlers return 401 BEFORE touching the DB, so the test needs no
 * database.
 */
const ROUTES: Array<[string, (req: Request) => Promise<Response>]> = [
  ['auto-delete-archived', autoDeleteArchived],
  ['idempotency-cleanup', idempotencyCleanup],
];

describe('cron auth guard fails closed', () => {
  let savedSecret: string | undefined;

  beforeEach(() => {
    savedSecret = process.env.CRON_SECRET;
  });
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: must truly unset the env var (assigning undefined coerces to the string "undefined")
    if (savedSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = savedSecret;
  });

  for (const [name, handler] of ROUTES) {
    it(`${name}: rejects "Bearer undefined" when CRON_SECRET is unset`, async () => {
      // biome-ignore lint/performance/noDelete: must truly unset the env var (assigning undefined coerces to the string "undefined")
      delete process.env.CRON_SECRET;
      const req = new Request('http://localhost:3000/api/cron/x', {
        headers: { Authorization: 'Bearer undefined' },
      });
      const res = await handler(req);
      expect(res.status).toBe(401);
    });

    it(`${name}: rejects a missing Authorization header`, async () => {
      process.env.CRON_SECRET = 'test-cron-secret';
      const req = new Request('http://localhost:3000/api/cron/x');
      const res = await handler(req);
      expect(res.status).toBe(401);
    });

    it(`${name}: rejects a wrong secret`, async () => {
      process.env.CRON_SECRET = 'test-cron-secret';
      const req = new Request('http://localhost:3000/api/cron/x', {
        headers: { Authorization: 'Bearer wrong' },
      });
      const res = await handler(req);
      expect(res.status).toBe(401);
    });
  }
});
