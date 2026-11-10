import {
  clearRegistry,
  defineAccumulationRegister,
  defineCatalog,
  field,
} from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { emitNav } from './emit-nav';

describe('emitNav', () => {
  it('emits one entry per catalog with label translations preserved', () => {
    clearRegistry();
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer', ru: 'Клиент' },
      pluralLabel: { en: 'Customers', ru: 'Клиенты' },
      fields: { name: field.string({ label: { en: 'Name' } }) },
      permissions: { read: 'any', write: 'any' },
    });
    const out = emitNav();
    expect(out).toContain('kind: "catalog"');
    expect(out).toContain('module: "sales"');
    expect(out).toContain('name: "customer"');
    expect(out).toContain('href: "/catalogs/sales.customer"');
    expect(out).toContain('"ru": "Клиенты"');
  });

  it('emits icon when the config defines one, omits it otherwise', () => {
    clearRegistry();
    defineCatalog({
      module: 'inventory',
      name: 'product',
      label: { en: 'Product' },
      pluralLabel: { en: 'Products' },
      icon: 'Package',
      fields: { name: field.string({ label: { en: 'Name' } }) },
      permissions: { read: 'any' },
    });
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      pluralLabel: { en: 'Customers' },
      fields: { name: field.string({ label: { en: 'Name' } }) },
      permissions: { read: 'any' },
    });
    const out = emitNav();
    expect(out).toContain('icon: "Package"');
    // customer entry has no icon, so "icon:" should only appear once
    expect(out.match(/icon:/g)?.length).toBe(1);
  });
});

describe('emitNav — registers', () => {
  it('emits one entry per register with kind "register" and /registers/ href', () => {
    clearRegistry();
    defineAccumulationRegister({
      module: 'inventory',
      name: 'stock_balance',
      label: { en: 'Stock Balance', ru: 'Остатки склада' },
      dimensions: {
        product: field.reference({
          label: { en: 'Product' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
      },
      resources: { quantity: field.number({ label: { en: 'Qty' }, required: true }) },
    });
    const out = emitNav();
    expect(out).toContain('kind: "register"');
    expect(out).toContain('id: "inventory.stock_balance"');
    expect(out).toContain('href: "/registers/inventory.stock_balance"');
    expect(out).toContain('"ru": "Остатки склада"');
  });
});
