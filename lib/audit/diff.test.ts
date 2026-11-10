import { describe, expect, it } from 'vitest';
import { shallowDiff } from './diff';

describe('shallowDiff', () => {
  it('returns only changed fields, ignoring unchanged ones', () => {
    const before = { name: 'Acme', code: 'A-001', active: true };
    const after = { name: 'Acme Inc', code: 'A-001', active: true };
    const rows = shallowDiff(before, after);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ field: 'name', before: 'Acme', after: 'Acme Inc' });
  });

  it('treats null before as create — all rows have before === undefined', () => {
    const after = { name: 'New', code: 'X-1' };
    const rows = shallowDiff(null, after);
    expect(rows).toHaveLength(2);
    // Sorted alphabetically by field.
    expect(rows.map((r) => r.field)).toEqual(['code', 'name']);
    for (const r of rows) {
      expect(r.before).toBeUndefined();
    }
    expect(rows.find((r) => r.field === 'name')?.after).toBe('New');
    expect(rows.find((r) => r.field === 'code')?.after).toBe('X-1');
  });

  it('treats null after as delete — all rows have after === undefined', () => {
    const before = { name: 'Old', code: 'Y-2' };
    const rows = shallowDiff(before, null);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.after).toBeUndefined();
    }
    expect(rows.find((r) => r.field === 'name')?.before).toBe('Old');
    expect(rows.find((r) => r.field === 'code')?.before).toBe('Y-2');
  });

  it('compares nested objects structurally', () => {
    const before = { meta: { a: 1, b: 2 }, note: 'same' };
    const after = { meta: { a: 1, b: 2 }, note: 'same' };
    expect(shallowDiff(before, after)).toEqual([]);
    const differing = { meta: { a: 1, b: 3 }, note: 'same' };
    const rows = shallowDiff(before, differing);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.field).toBe('meta');
  });

  it('returns empty array when both sides are null', () => {
    expect(shallowDiff(null, null)).toEqual([]);
  });
});
