import { describe, expect, it } from 'vitest';
import './fixed-asset';
import { getRegistry } from '@/platform/metadata';

describe('assets.fixed_asset catalog', () => {
  it('is registered as a catalog', () => {
    expect(getRegistry().catalog['assets.fixed_asset']).toBeDefined();
  });

  it('declares a status enum field with the three lifecycle values', () => {
    const cfg = getRegistry().catalog['assets.fixed_asset'];
    expect(cfg?.fields.status).toBeDefined();
    expect(cfg?.fields.status?.type).toBe('string');
    expect((cfg?.fields.status as { enumValues?: readonly string[] })?.enumValues).toEqual([
      'registered',
      'in_use',
      'disposed',
    ]);
  });

  it('declares a list config so renderV2CatalogList shows a real table', () => {
    const cfg = getRegistry().catalog['assets.fixed_asset'];
    expect(cfg?.list).toBeDefined();
    expect(cfg?.list?.layout ?? 'table').toBe('table');
    const keys = cfg?.list?.columns.map((c) => c.key) ?? [];
    expect(keys).toContain('name');
    expect(keys).toContain('inventoryNumber');
    expect(keys).toContain('status');
  });
});
