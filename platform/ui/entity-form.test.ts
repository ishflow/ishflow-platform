import type { FieldConfig } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { findWarehouseFieldName } from './entity-form';

const stringField: FieldConfig = {
  type: 'string',
  label: { en: 'Name', ru: 'Name', tr: 'Name' },
} as FieldConfig;

function refField(mod: string, name: string, extra: Partial<FieldConfig> = {}): FieldConfig {
  return {
    type: 'reference',
    label: { en: 'Ref', ru: 'Ref', tr: 'Ref' },
    to: { kind: 'ref', module: mod, name },
    ...extra,
  } as FieldConfig;
}

describe('findWarehouseFieldName', () => {
  it('returns null when there is no warehouse reference', () => {
    expect(findWarehouseFieldName({ name: stringField })).toBeNull();
    expect(
      findWarehouseFieldName({
        supplier: refField('purchases', 'supplier'),
        product: refField('inventory', 'product'),
      }),
    ).toBeNull();
  });

  it('returns the first field whose reference points at inventory.warehouse', () => {
    expect(
      findWarehouseFieldName({
        date: stringField,
        supplier: refField('purchases', 'supplier'),
        warehouse: refField('inventory', 'warehouse'),
      }),
    ).toBe('warehouse');
  });

  it('skips hidden and formHidden fields', () => {
    expect(
      findWarehouseFieldName({
        warehouse: refField('inventory', 'warehouse', { hidden: true }),
      }),
    ).toBeNull();
    expect(
      findWarehouseFieldName({
        warehouse: refField('inventory', 'warehouse', { formHidden: true }),
      }),
    ).toBeNull();
  });

  it('supports a custom field name (not only "warehouse")', () => {
    expect(
      findWarehouseFieldName({
        toWarehouse: refField('inventory', 'warehouse'),
      }),
    ).toBe('toWarehouse');
  });
});
