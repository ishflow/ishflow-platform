import { type MathNode, all, create } from 'mathjs/number';

// Spec (D1) proposed `create({ evaluateDependencies, parseDependencies })` to
// minimise surface area, but that dependency set does not pull in arithmetic
// operators (multiply/add/...), so `quantity * price` would throw
// "Function multiply missing". mathjs's documented fallback is `create(all)`;
// we still sandbox import()/createUnit() via the override below.
//
// `all` is typed `FactoryFunctionMap | undefined` under the mathjs/number
// subpath (upstream omits `.d.ts` per-entry), so we guard at load time.
if (!all) {
  throw new Error('formula: mathjs/number did not expose factory map');
}
const math = create(all);
math.import(
  {
    import: () => {
      throw new Error('formula: import() is disabled');
    },
    createUnit: () => {
      throw new Error('formula: createUnit is disabled');
    },
  },
  { override: true },
);

export type FormulaAST = MathNode;

const FORBIDDEN = /\b(?:import|createUnit|eval)\s*\(/;
const FUNCTION_DEF = /=\s*function|=\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*=/;

export function parseFormula(src: string): FormulaAST {
  if (FORBIDDEN.test(src) || FUNCTION_DEF.test(src)) {
    throw new Error('formula: unsafe expression');
  }
  try {
    return math.parse(src);
  } catch (e) {
    throw new Error(`formula: parse failed: ${(e as Error).message}`);
  }
}

export function evaluateFormula(ast: FormulaAST, scope: Record<string, unknown>): unknown {
  // mathjs mutates scope; pass a shallow copy to avoid leaking state.
  const referenced = collectReferencedNames(ast);
  for (const name of referenced) {
    if (!(name in scope)) {
      throw new Error(`formula: missing field "${name}"`);
    }
  }
  const out = ast.compile().evaluate({ ...scope });
  return out;
}

function collectReferencedNames(ast: FormulaAST): Set<string> {
  const names = new Set<string>();
  ast.traverse((node: MathNode) => {
    if (node.type === 'SymbolNode' && 'name' in node && typeof node.name === 'string') {
      names.add(node.name);
    }
  });
  return names;
}
