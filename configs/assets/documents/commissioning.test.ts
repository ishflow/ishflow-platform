import { describe, expect, it } from 'vitest';
import './commissioning';
import { getRegistry } from '@/platform/metadata';

describe('assets.commissioning document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['assets.commissioning']).toBeDefined();
  });

  it('is a status-change doc: no lines, no posting', () => {
    const cfg = getRegistry().document['assets.commissioning'];
    expect(cfg?.lines ?? {}).toEqual({});
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('has a required date + required asset reference header', () => {
    const cfg = getRegistry().document['assets.commissioning'];
    expect(cfg?.header?.date?.required).toBe(true);
    expect(cfg?.header?.asset?.required).toBe(true);
    expect(cfg?.header?.asset?.type).toBe('reference');
  });
});
