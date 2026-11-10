import { clearRegistry, defineCatalog, field } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { emitTypes } from './emit-types';

describe('emitTypes', () => {
  it('emits an interface per catalog with correct optionality', () => {
    clearRegistry();
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: {
        name: field.string({ label: { en: 'Name' }, required: true }),
        email: field.string({ label: { en: 'Email' } }),
        vip: field.boolean({ label: { en: 'VIP' } }),
      },
      permissions: { read: 'any', write: 'any' },
    });
    const out = emitTypes();
    expect(out).toContain('export interface SalesCustomer {');
    expect(out).toContain('  id: string;');
    expect(out).toContain('  tenantId: string;');
    expect(out).toContain('  name: string;');
    expect(out).toContain('  email: string | null;');
    expect(out).toContain('  vip: boolean | null;');
  });
});
