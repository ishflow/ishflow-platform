import { describe, expect, it } from 'vitest';
import { hasChanges, jsonDiff } from './json-diff';

describe('jsonDiff', () => {
  it('reports unchanged primitives', () => {
    const out = jsonDiff(5, 5);
    expect(out).toEqual([{ path: '', kind: 'unchanged', before: 5, after: 5 }]);
    expect(hasChanges(out)).toBe(false);
  });

  it('flags scalar mutation as changed', () => {
    const out = jsonDiff({ plan: 'free' }, { plan: 'pro' });
    expect(out).toContainEqual({
      path: 'plan',
      kind: 'changed',
      before: 'free',
      after: 'pro',
    });
    expect(hasChanges(out)).toBe(true);
  });

  it('flags new keys as added and missing keys as removed', () => {
    const out = jsonDiff({ a: 1 }, { a: 1, b: 2 });
    expect(out).toContainEqual({ path: 'a', kind: 'unchanged', before: 1, after: 1 });
    expect(out).toContainEqual({ path: 'b', kind: 'added', before: undefined, after: 2 });

    const out2 = jsonDiff({ a: 1, b: 2 }, { a: 1 });
    expect(out2).toContainEqual({
      path: 'b',
      kind: 'removed',
      before: 2,
      after: undefined,
    });
  });

  it('walks nested objects with dotted paths', () => {
    const out = jsonDiff({ user: { name: 'A' } }, { user: { name: 'B' } });
    expect(out).toContainEqual({
      path: 'user.name',
      kind: 'changed',
      before: 'A',
      after: 'B',
    });
  });

  it('walks arrays by index with bracket paths', () => {
    const out = jsonDiff([1, 2, 3], [1, 4, 3]);
    expect(out).toContainEqual({ path: '[1]', kind: 'changed', before: 2, after: 4 });
  });

  it('treats type mismatch as scalar change', () => {
    const out = jsonDiff([1, 2], { 0: 1, 1: 2 });
    expect(hasChanges(out)).toBe(true);
    expect(out.some((e) => e.kind === 'changed')).toBe(true);
  });

  it('handles null vs missing distinction', () => {
    const out = jsonDiff({ a: null }, {});
    expect(out).toContainEqual({
      path: 'a',
      kind: 'removed',
      before: null,
      after: undefined,
    });
  });
});
