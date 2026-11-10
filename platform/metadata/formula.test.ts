import { describe, expect, it } from 'vitest';
import { evaluateFormula, parseFormula } from './formula';

describe('formula', () => {
  it('parses a valid arithmetic expression', () => {
    const ast = parseFormula('quantity * price');
    expect(ast).toBeDefined();
  });
  it('evaluates against sibling record fields', () => {
    const ast = parseFormula('quantity * price');
    expect(evaluateFormula(ast, { quantity: 3, price: 4 })).toBe(12);
  });
  it('rejects access to unknown identifiers', () => {
    const ast = parseFormula('quantity * price');
    expect(() => evaluateFormula(ast, { quantity: 3 })).toThrow();
  });
  it('rejects unsafe expressions (function defs)', () => {
    expect(() => parseFormula('f(x) = x')).toThrow();
  });
  it('rejects unsafe expressions (imports)', () => {
    expect(() => parseFormula('import("x")')).toThrow();
  });
});
