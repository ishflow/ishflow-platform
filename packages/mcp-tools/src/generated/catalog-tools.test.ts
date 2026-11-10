/**
 * Tests over the codegen output. Lock in the surface contract (5 tools, names,
 * scopes) so accidental regressions in the codegen template surface
 * immediately. Engine behaviour itself lives under `platform/engine/crud.test.ts`.
 *
 * Shared surface assertions (name set, non-empty descriptions, read/write
 * scopes) are delegated to `assertToolContractShape`; this file keeps only
 * the per-tool input-schema behaviours that are domain-specific.
 */
import { describe, expect, it } from 'vitest';
import { assertToolContractShape } from '../test-utils';
import { catalogTools } from './catalog-tools';

describe('catalog tools', () => {
  it('matches the catalog tool contract (names + descriptions + scopes)', () => {
    assertToolContractShape(catalogTools, {
      reads: ['catalog_list', 'catalog_get'],
      writes: ['catalog_create', 'catalog_update', 'catalog_archive'],
    });
  });

  it('catalog_list rejects pageSize > 100', () => {
    const list = catalogTools.find((t) => t.name === 'catalog_list');
    expect(list).toBeDefined();
    const r = list?.inputSchema.safeParse({
      configId: 'sales.customer',
      pageSize: 9999,
    });
    expect(r?.success).toBe(false);
  });

  it('catalog_list accepts default pagination', () => {
    const list = catalogTools.find((t) => t.name === 'catalog_list');
    const r = list?.inputSchema.safeParse({ configId: 'sales.customer' });
    expect(r?.success).toBe(true);
  });

  it('catalog_list requires a known configId', () => {
    const list = catalogTools.find((t) => t.name === 'catalog_list');
    const r = list?.inputSchema.safeParse({ configId: 'definitely.not.a.catalog' });
    expect(r?.success).toBe(false);
  });

  it('catalog_get requires a UUID id', () => {
    const get = catalogTools.find((t) => t.name === 'catalog_get');
    expect(get).toBeDefined();
    expect(
      get?.inputSchema.safeParse({
        configId: 'sales.customer',
        id: 'not-a-uuid',
      }).success,
    ).toBe(false);
    expect(
      get?.inputSchema.safeParse({
        configId: 'sales.customer',
        id: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(true);
  });

  it('catalog_create rejects missing fields object', () => {
    const create = catalogTools.find((t) => t.name === 'catalog_create');
    const r = create?.inputSchema.safeParse({ configId: 'sales.customer' });
    expect(r?.success).toBe(false);
  });

  it('catalog_create accepts a fields record', () => {
    const create = catalogTools.find((t) => t.name === 'catalog_create');
    const r = create?.inputSchema.safeParse({
      configId: 'sales.customer',
      fields: { name: 'ACME', email: 'x@y.z' },
    });
    expect(r?.success).toBe(true);
  });

  it('catalog_update requires id + fields', () => {
    const upd = catalogTools.find((t) => t.name === 'catalog_update');
    expect(
      upd?.inputSchema.safeParse({ configId: 'sales.customer', fields: {} }).success,
    ).toBe(false);
    expect(
      upd?.inputSchema.safeParse({
        configId: 'sales.customer',
        id: '00000000-0000-0000-0000-000000000000',
        fields: { name: 'renamed' },
      }).success,
    ).toBe(true);
  });

  it('catalog_archive accepts a configId+uuid pair', () => {
    const arch = catalogTools.find((t) => t.name === 'catalog_archive');
    expect(
      arch?.inputSchema.safeParse({
        configId: 'sales.customer',
        id: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(true);
  });
});
