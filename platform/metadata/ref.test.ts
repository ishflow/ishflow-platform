import { describe, expect, it } from 'vitest';
import { ref } from './ref';

describe('ref()', () => {
  it('parses module.name form', () => {
    expect(ref('sales.customer')).toEqual({ kind: 'ref', module: 'sales', name: 'customer' });
  });
  it('rejects no-dot paths', () => {
    expect(() => ref('customer')).toThrow();
  });
  it('rejects multi-dot paths', () => {
    expect(() => ref('a.b.c')).toThrow();
  });
  it('rejects empty segments', () => {
    expect(() => ref('sales.')).toThrow();
    expect(() => ref('.customer')).toThrow();
    expect(() => ref('a..b')).toThrow();
    expect(() => ref('')).toThrow();
  });
});
