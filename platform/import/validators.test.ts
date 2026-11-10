import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES, getSchema } from './validators';

describe('ENTITY_TYPES', () => {
  it('exposes customer, product and supplier', () => {
    expect(ENTITY_TYPES).toEqual(['customer', 'product', 'supplier']);
  });
});

describe('getSchema("customer")', () => {
  const schema = getSchema('customer');

  it('accepts a minimal row with name only', () => {
    const out = schema.safeParse({ name: 'Acme Inc' });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.name).toBe('Acme Inc');
  });

  it('rejects a row with empty name', () => {
    const out = schema.safeParse({ name: '' });
    expect(out.success).toBe(false);
  });

  it('rejects a row missing name', () => {
    const out = schema.safeParse({});
    expect(out.success).toBe(false);
  });

  it('accepts optional email + phone + notes + externalId', () => {
    const out = schema.safeParse({
      name: 'Acme',
      email: 'a@b.com',
      phone: '+1-555',
      notes: 'priority',
      externalId: 'CUST-001',
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.email).toBe('a@b.com');
      expect(out.data.externalId).toBe('CUST-001');
    }
  });

  it('rejects a malformed email', () => {
    const out = schema.safeParse({ name: 'Acme', email: 'not-an-email' });
    expect(out.success).toBe(false);
  });

  it('coerces empty strings to undefined for optional fields', () => {
    const out = schema.safeParse({ name: 'Acme', email: '', phone: '' });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.email).toBeUndefined();
      expect(out.data.phone).toBeUndefined();
    }
  });
});

describe('getSchema("product")', () => {
  const schema = getSchema('product');

  it('accepts name only (code will be auto-generated)', () => {
    const out = schema.safeParse({ name: 'Widget' });
    expect(out.success).toBe(true);
  });

  it('accepts optional barcode + externalId', () => {
    const out = schema.safeParse({ name: 'Widget', barcode: '1234567890123', externalId: 'P-1' });
    expect(out.success).toBe(true);
  });

  it('rejects name longer than 200 chars', () => {
    const out = schema.safeParse({ name: 'x'.repeat(201) });
    expect(out.success).toBe(false);
  });
});

describe('getSchema("supplier")', () => {
  const schema = getSchema('supplier');

  it('accepts name only (code will be auto-generated)', () => {
    const out = schema.safeParse({ name: 'Acme Supplies' });
    expect(out.success).toBe(true);
  });

  it('accepts optional email + phone + notes + externalId', () => {
    const out = schema.safeParse({
      name: 'Acme Supplies',
      email: 's@b.com',
      phone: '+1-555',
      notes: 'preferred',
      externalId: 'SUP-1',
    });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.externalId).toBe('SUP-1');
  });

  it('rejects a malformed email', () => {
    const out = schema.safeParse({ name: 'Acme Supplies', email: 'nope' });
    expect(out.success).toBe(false);
  });
});

describe('getSchema(unknown)', () => {
  it('throws on unknown entity', () => {
    expect(() => getSchema('xyz' as never)).toThrow();
  });
});
