import { navManifest } from '@/lib/generated/nav';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

import './index';

describe('configs/index', () => {
  it('registers every catalog the nav manifest advertises', () => {
    const registry = getRegistry();
    const missing = navManifest
      .filter((entry) => entry.kind === 'catalog')
      .filter((entry) => registry.catalog[entry.id] === undefined)
      .map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('registers every document the nav manifest advertises', () => {
    const registry = getRegistry();
    const missing = navManifest
      .filter((entry) => entry.kind === 'document')
      .filter((entry) => registry.document[entry.id] === undefined)
      .map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('registers every register the nav manifest advertises', () => {
    const registry = getRegistry();
    const missing = navManifest
      .filter((entry) => entry.kind === 'register')
      .filter((entry) => registry.register[entry.id] === undefined)
      .map((entry) => entry.id);
    expect(missing).toEqual([]);
  });
});
