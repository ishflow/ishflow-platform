import { clearRegistry, getRegistry } from '@/platform/metadata';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(() => clearRegistry());

describe('inventory.warehouse catalog', () => {
  it('registers in the registry with code + name + address fields', async () => {
    await import('./warehouse');
    const cfg = getRegistry().catalog['inventory.warehouse'];
    expect(cfg).toBeDefined();
    expect(cfg?.fields.name).toBeDefined();
    expect(cfg?.fields.code).toBeDefined();
    expect(cfg?.fields.address).toBeDefined();
    expect(cfg?.displayField).toBe('name');
  });
});
