import { describe, expect, it } from 'vitest';
import './disposal';
import { getRegistry } from '@/platform/metadata';

describe('assets.disposal document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['assets.disposal']).toBeDefined();
  });

  it('is single-header with no currency field and no lines', () => {
    const cfg = getRegistry().document['assets.disposal'];
    expect(cfg?.header?.currency).toBeUndefined();
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('has no register postings in the foundation phase', () => {
    const cfg = getRegistry().document['assets.disposal'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('exposes a disposalMethod enum with the five canonical values', () => {
    const cfg = getRegistry().document['assets.disposal'];
    const disposalMethod = cfg?.header?.disposalMethod as
      | { type: string; enumValues?: readonly string[] }
      | undefined;
    expect(disposalMethod).toBeDefined();
    expect(disposalMethod?.type).toBe('string');
    expect(disposalMethod?.enumValues).toEqual(['sold', 'scrapped', 'donated', 'lost', 'other']);
  });
});
