import { beforeEach, describe, expect, it } from 'vitest';
import {
  defineAccumulationRegister,
  defineCatalog,
  defineDocument,
  defineInformationRegister,
} from './define';
import { field } from './field';
import { clearRegistry, getRegistry } from './registry';

describe('defineCatalog', () => {
  it('registers a catalog under module.name', () => {
    clearRegistry();
    const cfg = defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer', ru: 'Клиент' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any' },
    });
    expect(cfg.id).toBe('sales.customer');
    expect(getRegistry().catalog['sales.customer']).toBe(cfg);
  });

  it('throws on duplicate registration', () => {
    clearRegistry();
    const make = () =>
      defineCatalog({
        module: 'sales',
        name: 'customer',
        label: { en: 'Customer' },
        fields: { name: field.string({ label: { en: 'Name' } }) },
        permissions: { read: 'any', write: 'any' },
      });
    make();
    expect(make).toThrow(/already registered/);
  });

  it('validates formula fields at registration', () => {
    clearRegistry();
    expect(() =>
      defineCatalog({
        module: 'sales',
        name: 'x',
        label: { en: 'X' },
        fields: {
          total: field.money({ label: { en: 'T' }, formula: 'import("x")' }),
        },
        permissions: { read: 'any', write: 'any' },
      }),
    ).toThrow(/unsafe expression/);
  });
});

describe('defineDocument', () => {
  it('registers a document under module.name', () => {
    clearRegistry();
    const cfg = defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: {
        date: field.datetime({ label: { en: 'Date' }, required: true }),
      },
      posting: {},
      permissions: { read: 'any' },
    });
    expect(cfg.id).toBe('sales.invoice');
    expect(getRegistry().document['sales.invoice']).toBe(cfg);
  });

  it('throws on duplicate document registration', () => {
    clearRegistry();
    const make = () =>
      defineDocument({
        module: 'sales',
        name: 'invoice',
        label: { en: 'Invoice' },
        header: { date: field.datetime({ label: { en: 'D' }, required: true }) },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      });
    make();
    expect(make).toThrow(/already registered/);
  });
});

describe('defineDocument with lines', () => {
  it('accepts a lines section and round-trips through the registry', () => {
    clearRegistry();
    const cfg = defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
      lines: {
        items: {
          label: { en: 'Line' },
          minRows: 1,
          fields: {
            product: field.reference({
              label: { en: 'Product' },
              required: true,
              to: { kind: 'ref', module: 'inventory', name: 'product' },
            }),
            quantity: field.number({ label: { en: 'Qty' }, required: true, min: 1 }),
          },
        },
      },
      posting: {},
      permissions: { read: 'any' },
    });
    const section = cfg.lines?.items;
    expect(section).toBeDefined();
    expect(section?.fields.product?.type).toBe('reference');
    expect(getRegistry().document['sales.invoice']).toBe(cfg);
  });

  it('treats absent lines the same as empty lines', () => {
    clearRegistry();
    const cfg = defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
      posting: {},
      permissions: { read: 'any', write: 'any' },
    });
    expect(cfg.lines).toBeUndefined();
  });

  it('rejects a line section whose key is not a valid identifier', () => {
    clearRegistry();
    expect(() =>
      defineDocument({
        module: 'sales',
        name: 'invoice',
        label: { en: 'Invoice' },
        header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
        lines: {
          'bad key': {
            label: { en: 'Line' },
            fields: { quantity: field.number({ label: { en: 'Qty' } }) },
          },
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      }),
    ).toThrow(/line section/);
  });

  it('rejects a line field that collides with a reserved system column', () => {
    clearRegistry();
    const make = (name: string) =>
      defineDocument({
        module: 'sales',
        name: 'invoice',
        label: { en: 'Invoice' },
        header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
        lines: {
          items: {
            label: { en: 'Line' },
            fields: { [name]: field.number({ label: { en: 'X' } }) },
          },
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      });
    for (const reserved of ['id', 'tenantId', 'documentId', 'sequence', 'createdAt', 'updatedAt']) {
      clearRegistry();
      expect(() => make(reserved)).toThrow(/reserved/);
    }
  });

  it('rejects a line field name that is not camelCase', () => {
    clearRegistry();
    expect(() =>
      defineDocument({
        module: 'sales',
        name: 'invoice',
        label: { en: 'Invoice' },
        header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
        lines: {
          items: {
            label: { en: 'Line' },
            fields: { bad_name: field.number({ label: { en: 'X' } }) },
          },
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      }),
    ).toThrow(/camelCase/);
  });
});

describe('defineAccumulationRegister', () => {
  it('registers a register under module.name', () => {
    clearRegistry();
    const cfg = defineAccumulationRegister({
      module: 'inventory',
      name: 'stock_balance',
      label: { en: 'Stock Balance' },
      dimensions: {
        product: field.reference({
          label: { en: 'Product' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
      },
      resources: {
        quantity: field.number({ label: { en: 'Qty' } }),
      },
    });
    expect(cfg.id).toBe('inventory.stock_balance');
    expect(getRegistry().register['inventory.stock_balance']).toBe(cfg);
  });
});

describe('defineInformationRegister', () => {
  beforeEach(() => clearRegistry());

  it('registers a periodic register with composite key', () => {
    const cfg = defineInformationRegister({
      module: 'inventory',
      name: 'product_price',
      label: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
      periodicity: 'date',
      dimensions: {
        product: field.reference({
          label: { en: 'Product' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        priceType: field.reference({
          label: { en: 'Price Type' },
          required: true,
          to: { kind: 'ref', module: 'sales', name: 'price_type' },
        }),
      },
      resources: { price: field.money({ label: { en: 'Price' }, required: true }) },
      recorder: { module: 'inventory', name: 'price_setting' },
      permissions: { read: 'any' },
    });

    expect(cfg.id).toBe('inventory.product_price');
    expect(getRegistry().informationRegister[cfg.id]).toBe(cfg);
    expect(getRegistry().register[cfg.id]).toBe(cfg);
    expect(getRegistry().accumulationRegister[cfg.id]).toBeUndefined();
  });

  it('throws on missing dimensions', () => {
    expect(() =>
      defineInformationRegister({
        module: 'm',
        name: 'r',
        label: { en: 'x', ru: 'x', tr: 'x' },
        periodicity: 'date',
        dimensions: {},
        resources: { v: field.money({ label: { en: 'V' }, required: true }) },
        recorder: { module: 'm', name: 'd' },
        permissions: { read: 'any' },
      }),
    ).toThrow(/at least one dimension/);
  });

  it('throws on missing resources', () => {
    expect(() =>
      defineInformationRegister({
        module: 'm',
        name: 'r',
        label: { en: 'x', ru: 'x', tr: 'x' },
        periodicity: 'date',
        dimensions: {
          d: field.reference({ label: { en: 'D' }, to: { kind: 'ref', module: 'm', name: 'c' } }),
        },
        resources: {},
        recorder: { module: 'm', name: 'd' },
        permissions: { read: 'any' },
      }),
    ).toThrow(/at least one resource/);
  });
});
