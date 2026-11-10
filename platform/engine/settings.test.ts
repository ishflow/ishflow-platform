import { withTenant } from '@/platform/db/tenant-context';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSettings, listSettings, setSettings } from './settings';

const TEST_TENANT = '00000000-0000-0000-0000-000000d3b001';
let db: PrismaClient;

beforeAll(() => {
  db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
});
afterAll(async () => {
  await db.$disconnect();
});

describe('settings storage helpers', () => {
  it('returns null for missing settings key', async () => {
    const got = await withTenant(TEST_TENANT, (tx) =>
      getSettings(tx, TEST_TENANT, 'admin.does_not_exist'),
    );
    expect(got).toBeNull();
  });

  it('round-trips set → get', async () => {
    const payload = { companyName: 'ACME', primaryColor: '#0EA5E9' };
    await withTenant(TEST_TENANT, (tx) =>
      setSettings(tx, TEST_TENANT, 'admin.branding_test', payload),
    );
    const got = await withTenant(TEST_TENANT, (tx) =>
      getSettings(tx, TEST_TENANT, 'admin.branding_test'),
    );
    expect(got).toEqual(payload);
  });

  it('overwrites on second set', async () => {
    await withTenant(TEST_TENANT, (tx) =>
      setSettings(tx, TEST_TENANT, 'admin.overwrite_test', { x: 1 }),
    );
    await withTenant(TEST_TENANT, (tx) =>
      setSettings(tx, TEST_TENANT, 'admin.overwrite_test', { x: 2 }),
    );
    const got = await withTenant(TEST_TENANT, (tx) =>
      getSettings(tx, TEST_TENANT, 'admin.overwrite_test'),
    );
    expect(got).toEqual({ x: 2 });
  });

  it('listSettings returns all keys for tenant', async () => {
    await withTenant(TEST_TENANT, (tx) => setSettings(tx, TEST_TENANT, 'admin.list_a', { v: 'a' }));
    await withTenant(TEST_TENANT, (tx) => setSettings(tx, TEST_TENANT, 'admin.list_b', { v: 'b' }));
    const list = await withTenant(TEST_TENANT, (tx) => listSettings(tx, TEST_TENANT));
    const keys = list.map((s) => s.key);
    expect(keys).toContain('admin.list_a');
    expect(keys).toContain('admin.list_b');
  });
});
