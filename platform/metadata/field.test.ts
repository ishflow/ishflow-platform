import { describe, expect, expectTypeOf, it } from 'vitest';
import { field } from './field';
import type { StringFieldConfig } from './types';

describe('field builders', () => {
  it('field.string returns a StringFieldConfig', () => {
    expect(field.string({ label: { en: 'Name' }, required: true })).toEqual({
      type: 'string',
      label: { en: 'Name' },
      required: true,
    });
    expectTypeOf(field.string({ label: { en: 'Name' } })).toEqualTypeOf<StringFieldConfig>();
  });

  it('field.money accepts formula and currency', () => {
    expect(field.money({ label: { en: 'Total' }, formula: 'quantity * price' })).toEqual({
      type: 'money',
      label: { en: 'Total' },
      formula: 'quantity * price',
    });
  });

  it('field.reference accepts a ReferenceToken', () => {
    const tok = { kind: 'ref' as const, module: 'sales', name: 'customer' };
    expect(field.reference({ label: { en: 'Customer' }, to: tok })).toEqual({
      type: 'reference',
      label: { en: 'Customer' },
      to: tok,
    });
  });
});

describe('field.number transforms', () => {
  it('accepts a named transform identifier', () => {
    const f = field.number({
      label: { en: 'Markup %' },
      min: 0,
      max: 999.99,
      transform: 'percentFraction',
    });
    expect(f.transform).toBe('percentFraction');
    expect(f.min).toBe(0);
    expect(f.max).toBe(999.99);
  });

  it('leaves transform undefined when not provided', () => {
    const f = field.number({ label: { en: 'Qty' } });
    expect(f.transform).toBeUndefined();
  });
});
