import { describe, expect, it } from 'vitest';
import { serializeRow } from './serialize';

describe('serializeRow', () => {
  it('converts snake_case keys to camelCase', () => {
    const out = serializeRow({
      first_name: 'Anna',
      last_name: 'Ivanova',
      price_type_id: 'pt_1',
    });
    expect(out).toEqual({
      firstName: 'Anna',
      lastName: 'Ivanova',
      priceTypeId: 'pt_1',
    });
  });

  it('renders Date instances as ISO 8601 strings', () => {
    const created = new Date('2026-05-13T10:15:00.000Z');
    const out = serializeRow({ id: 'x', createdAt: created });
    expect(out).toEqual({ id: 'x', createdAt: '2026-05-13T10:15:00.000Z' });
  });

  it('drops the default omit list (tenantId, deletedAt, snake variants)', () => {
    const out = serializeRow({
      id: 'p1',
      tenantId: 'tenant-uuid',
      tenant_id: 'tenant-uuid',
      deletedAt: null,
      deleted_at: null,
      name: 'Widget',
    });
    expect(out).toEqual({ id: 'p1', name: 'Widget' });
    expect(Object.keys(out)).not.toContain('tenantId');
    expect(Object.keys(out)).not.toContain('deletedAt');
  });

  it('merges caller omit list with defaults', () => {
    const out = serializeRow({ id: 'p1', tenantId: 't', secret: 'hush', name: 'Widget' }, [
      'secret',
    ]);
    expect(out).toEqual({ id: 'p1', name: 'Widget' });
  });

  it('preserves null values so consumers can tell "absent" from "missing"', () => {
    const out = serializeRow({
      id: 'p1',
      category_id: null,
      group_id: undefined,
      name: 'Widget',
    });
    expect(out).toEqual({
      id: 'p1',
      categoryId: null,
      groupId: undefined,
      name: 'Widget',
    });
    expect(Object.keys(out)).toContain('categoryId');
  });
});
