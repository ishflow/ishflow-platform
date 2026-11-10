import { describe, expect, it } from 'vitest';
import { fieldToZod, fieldsToZodObject } from './dsl-to-zod';

describe('fieldToZod', () => {
  it('string accepts strings', () => {
    expect(fieldToZod({ type: 'string' }).safeParse('x').success).toBe(true);
  });

  it('text accepts strings', () => {
    expect(fieldToZod({ type: 'text' }).safeParse('long body').success).toBe(true);
  });

  it('int rejects floats', () => {
    expect(fieldToZod({ type: 'int' }).safeParse(1.5).success).toBe(false);
    expect(fieldToZod({ type: 'int' }).safeParse(7).success).toBe(true);
  });

  it('decimal accepts floats and ints', () => {
    expect(fieldToZod({ type: 'decimal' }).safeParse(1.5).success).toBe(true);
    expect(fieldToZod({ type: 'decimal' }).safeParse(2).success).toBe(true);
  });

  it('bool accepts booleans, rejects strings', () => {
    expect(fieldToZod({ type: 'bool' }).safeParse(true).success).toBe(true);
    expect(fieldToZod({ type: 'bool' }).safeParse('true').success).toBe(false);
  });

  it('optional tolerates undefined', () => {
    expect(fieldToZod({ type: 'string', optional: true }).safeParse(undefined).success).toBe(true);
  });

  it('required rejects undefined', () => {
    expect(fieldToZod({ type: 'string' }).safeParse(undefined).success).toBe(false);
  });

  it('enum constrains values', () => {
    const schema = fieldToZod({ type: 'enum', enumValues: ['a', 'b'] });
    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('c').success).toBe(false);
  });

  it('enum without values throws', () => {
    expect(() => fieldToZod({ type: 'enum' })).toThrow();
    expect(() => fieldToZod({ type: 'enum', enumValues: [] })).toThrow();
  });

  it('ref demands UUID', () => {
    const schema = fieldToZod({ type: 'ref' });
    expect(schema.safeParse('not-a-uuid').success).toBe(false);
    expect(schema.safeParse('00000000-0000-0000-0000-000000000000').success).toBe(true);
  });

  it('date demands ISO-8601 with offset', () => {
    const schema = fieldToZod({ type: 'date' });
    expect(schema.safeParse('2026-05-24T00:00:00Z').success).toBe(true);
    expect(schema.safeParse('not a date').success).toBe(false);
  });

  it('dateTime demands ISO-8601 with offset', () => {
    const schema = fieldToZod({ type: 'dateTime' });
    expect(schema.safeParse('2026-05-24T12:34:56Z').success).toBe(true);
    expect(schema.safeParse('2026-05-24T12:34:56+03:00').success).toBe(true);
    expect(schema.safeParse('not a date').success).toBe(false);
  });
});

describe('fieldsToZodObject', () => {
  it('composes fields with required + optional', () => {
    const schema = fieldsToZodObject({
      name: { type: 'string' },
      count: { type: 'int', optional: true },
    });
    expect(schema.safeParse({ name: 'x' }).success).toBe(true);
    expect(schema.safeParse({ name: 'x', count: 3 }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown shapes when strictly parsed', () => {
    const schema = fieldsToZodObject({ name: { type: 'string' } });
    // z.object by default strips unknown keys rather than failing — confirm
    // the parsed payload is the cleaned shape, not the raw input.
    const parsed = schema.parse({ name: 'x', extra: 'ignored' });
    expect(parsed).toEqual({ name: 'x' });
  });
});
