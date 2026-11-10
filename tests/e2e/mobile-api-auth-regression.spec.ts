import { expect, test } from '@playwright/test';

test('non-mobile API still requires session auth', async ({ request }) => {
  const res = await request.get('/api/warehouse-stock');
  // Clerk middleware rewrites unauthenticated requests to an internal page;
  // the absence of 200/401-from-handler proves middleware is blocking.
  expect(res.status()).not.toBe(200);
  expect(res.headers()['x-clerk-auth-reason']).toContain('protect-rewrite');
});

test('mobile API reaches route handler without session auth', async ({ request }) => {
  const res = await request.get('/api/mobile/me');
  // middleware no longer blocks mobile routes; handler returns 401 with JSON body
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error).toBe('unauthorized');
});
