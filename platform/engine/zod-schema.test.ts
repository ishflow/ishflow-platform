import { clearRegistry, defineCatalog, field, getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { buildZodSchema } from './zod-schema';

describe('buildZodSchema', () => {
  it('required string rejects empty and missing', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'a',
      label: { en: 'A' },
      fields: { name: field.string({ label: { en: 'N' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.a'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ name: '' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ name: 'Acme' }).success).toBe(true);
  });

  it('string maxLength enforced', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'b',
      label: { en: 'B' },
      fields: { code: field.string({ label: { en: 'C' }, required: true, maxLength: 5 }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.b'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ code: '123456' }).success).toBe(false);
    expect(schema.safeParse({ code: '12345' }).success).toBe(true);
  });

  it('optional string allows empty/undefined', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'c',
      label: { en: 'C' },
      fields: { nick: field.string({ label: { en: 'N' } }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.c'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ nick: '' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ nick: 'x' }).success).toBe(true);
  });

  it('email string validates format, tolerates empty when optional', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'email_opt',
      label: { en: 'E' },
      fields: { email: field.string({ label: { en: 'Email' }, email: true }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.email_opt'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    expect(schema.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(schema.safeParse({ email: '' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('number coerces strings and enforces min/max', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'd',
      label: { en: 'D' },
      fields: {
        qty: field.number({ label: { en: 'Q' }, required: true, min: 0, max: 10 }),
      },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.d'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ qty: '5' }).data).toEqual({ qty: 5 });
    expect(schema.safeParse({ qty: '11' }).success).toBe(false);
    expect(schema.safeParse({ qty: 'abc' }).success).toBe(false);
  });

  it('money rejects negative', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'e',
      label: { en: 'E' },
      fields: { price: field.money({ label: { en: 'P' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.e'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ price: '10.50' }).success).toBe(true);
    expect(schema.safeParse({ price: '-1' }).success).toBe(false);
  });

  it('boolean coerces "true"/"false"', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'f',
      label: { en: 'F' },
      fields: { active: field.boolean({ label: { en: 'A' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.f'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.safeParse({ active: 'true' }).data).toEqual({ active: true });
    expect(schema.safeParse({ active: false }).data).toEqual({ active: false });
  });

  it('date coerces ISO string to Date', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'g',
      label: { en: 'G' },
      fields: { dob: field.date({ label: { en: 'D' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.g'] as import('@/platform/metadata').CatalogConfig,
    );
    const parsed = schema.safeParse({ dob: '2024-01-02' });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.dob).toBeInstanceOf(Date);
  });

  it('hidden fields are omitted from schema', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'h',
      label: { en: 'H' },
      fields: {
        name: field.string({ label: { en: 'N' }, required: true }),
        secret: field.string({ label: { en: 'S' }, hidden: true }),
      },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.h'] as import('@/platform/metadata').CatalogConfig,
    );
    expect(schema.shape.secret).toBeUndefined();
    expect(schema.shape.name).toBeDefined();
  });

  it('formHidden fields are omitted from schema (form validation) but not hidden from list', () => {
    clearRegistry();
    defineCatalog({
      module: 'test',
      name: 'i',
      label: { en: 'I' },
      fields: {
        name: field.string({ label: { en: 'N' }, required: true }),
        code: field.string({
          label: { en: 'C' },
          required: true,
          formHidden: true,
          autoGenerate: 'sequence',
        }),
      },
      permissions: { read: 'any', write: 'any' },
    });
    const schema = buildZodSchema(
      getRegistry().catalog['test.i'] as import('@/platform/metadata').CatalogConfig,
    );
    // formHidden field is excluded from the form Zod schema
    expect(schema.shape.code).toBeUndefined();
    // non-hidden field remains
    expect(schema.shape.name).toBeDefined();
    // schema accepts a valid payload without code (engine fills it in)
    expect(schema.safeParse({ name: 'Acme' }).success).toBe(true);
  });
});
