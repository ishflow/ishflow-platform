import { clearRegistry, getRegistry } from '@/platform/metadata';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(() => clearRegistry());

describe('treasury.cash_register catalog', () => {
  it('is registered as a catalog with a required name field', async () => {
    await import('./cash-register');
    const cfg = getRegistry().catalog['treasury.cash_register'];
    expect(cfg).toBeDefined();
    expect(cfg?.fields.name?.required).toBe(true);
  });
});
