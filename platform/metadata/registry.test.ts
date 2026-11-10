import { beforeEach, describe, expect, it } from 'vitest';
import { clearRegistry, getRegistry, registerCatalog } from './registry';
import type { CatalogConfig } from './types';

const cfg: CatalogConfig = {
  id: 'x.y',
  module: 'x',
  name: 'y',
  label: { en: 'Y' },
  fields: {},
  permissions: { read: 'any', write: 'none', delete: 'none' },
};

describe('registerCatalog', () => {
  beforeEach(() => clearRegistry());

  it('registers once', () => {
    registerCatalog(cfg);
    expect(getRegistry().catalog['x.y']).toBe(cfg);
  });

  it('is idempotent for the same config object', () => {
    registerCatalog(cfg);
    expect(() => registerCatalog(cfg)).not.toThrow();
  });

  it('throws on different config for same id', () => {
    registerCatalog(cfg);
    const other = { ...cfg, label: { en: 'Different' } };
    expect(() => registerCatalog(other)).toThrow(/already registered/);
  });
});
