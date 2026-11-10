import { describe, expect, it } from 'vitest';
import './material-request';
import { getRegistry } from '@/platform/metadata';

describe('inventory.material_request document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['inventory.material_request']).toBeDefined();
  });

  it('writes NO register movements (planning record, status-only)', () => {
    const cfg = getRegistry().document['inventory.material_request'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('items section: product + quantity REQUIRED, no money fields', () => {
    const items = getRegistry().document['inventory.material_request']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBe(true);
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price).toBeUndefined();
  });
});
