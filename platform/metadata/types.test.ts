import { describe, expectTypeOf, it } from 'vitest';
import type { CatalogConfig, FieldConfig, FieldType, ReferenceToken } from './types';

describe('metadata types', () => {
  it('FieldType enumerates all scalar types', () => {
    expectTypeOf<FieldType>().toEqualTypeOf<
      | 'string'
      | 'text'
      | 'number'
      | 'money'
      | 'boolean'
      | 'date'
      | 'datetime'
      | 'reference'
      | 'docNumber'
      | 'docRef'
      | 'documentLink'
      | 'color'
      | 'custom'
    >();
  });

  it('CatalogConfig requires id, module, name, label, fields, permissions', () => {
    const sample: CatalogConfig = {
      id: 'sales.customer',
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer', ru: 'Клиент' },
      fields: {
        name: { type: 'string', label: { en: 'Name', ru: 'Наименование' }, required: true },
      },
      permissions: { read: 'any' },
    };
    expectTypeOf(sample).toMatchTypeOf<CatalogConfig>();
    expectTypeOf<CatalogConfig['fields'][string]>().toEqualTypeOf<FieldConfig>();
  });

  it('ReferenceToken carries module and name', () => {
    const tok: ReferenceToken = { kind: 'ref', module: 'sales', name: 'customer' };
    expectTypeOf(tok).toMatchTypeOf<ReferenceToken>();
  });
});
