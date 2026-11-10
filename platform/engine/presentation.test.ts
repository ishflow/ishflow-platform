import { defineCatalog, defineDocument, field } from '@/platform/metadata';
import { clearRegistry } from '@/platform/metadata/registry';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCatalogPresentation, getDocumentPresentation, getPresentation } from './presentation';

describe('presentation', () => {
  beforeEach(() => {
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  describe('default catalog presentation', () => {
    it('uses displayField value when present', () => {
      const cfg = defineCatalog({
        module: 'demo',
        name: 'product',
        label: { en: 'Product' },
        fields: {
          code: field.string({ label: { en: 'Code' }, required: true }),
          name: field.string({ label: { en: 'Name' }, required: true }),
        },
        permissions: { read: 'any', write: 'any' },
        displayField: 'name',
      });

      const text = getCatalogPresentation(cfg, {
        id: 'abc-12345',
        name: 'Widget',
        code: 'W-1',
      });
      expect(text).toBe('Widget');
    });

    it('falls back to code when displayField is empty', () => {
      const cfg = defineCatalog({
        module: 'demo',
        name: 'product',
        label: { en: 'Product' },
        fields: {
          code: field.string({ label: { en: 'Code' }, required: true }),
          name: field.string({ label: { en: 'Name' }, required: true }),
        },
        permissions: { read: 'any', write: 'any' },
        displayField: 'name',
      });

      const text = getCatalogPresentation(cfg, {
        id: 'abc-12345678',
        name: '',
        code: 'W-1',
      });
      expect(text).toBe('W-1');
    });

    it('falls back to short uuid when both displayField and code are missing', () => {
      const cfg = defineCatalog({
        module: 'demo',
        name: 'thing',
        label: { en: 'Thing' },
        fields: {
          name: field.string({ label: { en: 'Name' } }),
        },
        permissions: { read: 'any', write: 'any' },
      });

      const text = getCatalogPresentation(cfg, { id: 'abcd1234-rest', name: '' });
      expect(text).toBe('abcd1234');
    });

    it('uses custom presentation when provided', () => {
      const cfg = defineCatalog({
        module: 'demo',
        name: 'product',
        label: { en: 'Product' },
        fields: {
          code: field.string({ label: { en: 'Code' }, required: true }),
          name: field.string({ label: { en: 'Name' }, required: true }),
        },
        permissions: { read: 'any', write: 'any' },
        displayField: 'name',
        presentation: (record) => `${record.code} • ${record.name}`,
      });

      const text = getCatalogPresentation(cfg, { id: 'x', code: 'W-1', name: 'Widget' });
      expect(text).toBe('W-1 • Widget');
    });
  });

  describe('default document presentation', () => {
    it('formats as "<TypeLabel> <number> — <yyyy-mm-dd>"', () => {
      const cfg = defineDocument({
        module: 'sales',
        name: 'invoice',
        label: { en: 'Sales Invoice' },
        header: {
          number: field.docNumber({ label: { en: 'Number' }, prefix: 'SI-' }),
          date: field.datetime({ label: { en: 'Date' }, required: true }),
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      });

      const text = getDocumentPresentation(cfg, {
        id: 'doc-1',
        number: 'SI-000123',
        date: new Date('2026-05-31T12:00:00Z'),
      });
      expect(text).toBe('Sales Invoice SI-000123 — 2026-05-31');
    });

    it('falls back gracefully when date is missing', () => {
      const cfg = defineDocument({
        module: 'sales',
        name: 'invoice',
        label: { en: 'Sales Invoice' },
        header: {
          number: field.docNumber({ label: { en: 'Number' }, prefix: 'SI-' }),
          date: field.datetime({ label: { en: 'Date' } }),
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      });

      const text = getDocumentPresentation(cfg, { id: 'doc-1', number: 'SI-000123' });
      expect(text).toBe('Sales Invoice SI-000123');
    });

    it('uses custom presentation when provided', () => {
      const cfg = defineDocument({
        module: 'sales',
        name: 'payment_received',
        label: { en: 'Payment' },
        header: {
          number: field.docNumber({ label: { en: 'Number' }, prefix: 'PR-' }),
          amount: field.money({ label: { en: 'Amount' }, required: true }),
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
        presentation: (record) => `${record.number} (${record.amount})`,
      });

      const text = getDocumentPresentation(cfg, {
        id: 'doc-1',
        number: 'PR-000001',
        amount: 1250,
      });
      expect(text).toBe('PR-000001 (1250)');
    });
  });

  describe('getPresentation by typeId', () => {
    it('resolves catalog by id', () => {
      defineCatalog({
        module: 'demo',
        name: 'thing',
        label: { en: 'Thing' },
        fields: {
          name: field.string({ label: { en: 'Name' }, required: true }),
        },
        permissions: { read: 'any', write: 'any' },
        displayField: 'name',
      });

      const text = getPresentation('demo.thing', { id: 'abc', name: 'Widget' });
      expect(text).toBe('Widget');
    });

    it('resolves document by id', () => {
      defineDocument({
        module: 'demo',
        name: 'order',
        label: { en: 'Order' },
        header: {
          number: field.docNumber({ label: { en: 'Number' }, prefix: 'O-' }),
          date: field.datetime({ label: { en: 'Date' }, required: true }),
        },
        posting: {},
        permissions: { read: 'any', write: 'any' },
      });

      const text = getPresentation('demo.order', {
        id: 'doc-1',
        number: 'O-000001',
        date: new Date('2026-04-16T00:00:00Z'),
      });
      expect(text).toBe('Order O-000001 — 2026-04-16');
    });

    it('returns short uuid fallback when type is unknown', () => {
      const text = getPresentation('unknown.type', { id: 'abcdef12-rest' });
      expect(text).toBe('abcdef12');
    });

    it('returns "—" when record has no id and type is unknown', () => {
      const text = getPresentation('unknown.type', {});
      expect(text).toBe('—');
    });
  });
});
