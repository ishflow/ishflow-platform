import { describe, expect, it } from 'vitest';
import './receipt';
import { getRegistry } from '@/platform/metadata';

describe('assets.receipt document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['assets.receipt']).toBeDefined();
  });

  it('is single-header with no currency field and no lines', () => {
    const cfg = getRegistry().document['assets.receipt'];
    expect(cfg?.header?.currency).toBeUndefined();
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('has no register postings in the foundation phase', () => {
    const cfg = getRegistry().document['assets.receipt'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });
});
