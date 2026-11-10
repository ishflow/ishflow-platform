/**
 * Shared test helpers for the MCP tools package. Human-written — NOT under
 * `generated/` — so the codegen leaves it alone.
 *
 * The codegen-driven test files (catalog-tools.test.ts, document-tools.test.ts,
 * and the upcoming register / report variants) all assert the same three things
 * over the emitted tool array:
 *   1. The set of tool names matches the expected reads + writes lists exactly.
 *   2. Every description is long enough to be non-trivially populated.
 *   3. Reads carry `requiredScope: 'read'`; writes carry `'write'`.
 *
 * Factoring this into `assertToolContractShape` collapses three duplicated
 * `it(...)` blocks per domain into a single call, leaving the domain test files
 * to focus on truly per-domain things (UUID validation, configId enum,
 * date-range rejection, etc).
 */
import { expect } from 'vitest';

import type { ToolDefinition } from './types';

export interface ToolContractExpectation {
  /** Tool names whose `requiredScope` must be `'read'`. */
  reads: string[];
  /** Tool names whose `requiredScope` must be `'write'`. */
  writes: string[];
}

/**
 * Asserts the surface contract of a domain's emitted tool array:
 *   - The sorted tool-name set equals `[...reads, ...writes].sort()`.
 *   - Every description is meaningfully populated (>20 chars).
 *   - Each name in `reads` has `requiredScope === 'read'`.
 *   - Each name in `writes` has `requiredScope === 'write'`.
 *
 * Call once per domain test file as the first `it(...)`. The non-null
 * assertions on `find(...)` are safe because the preceding name-set check
 * already guarantees every name is present.
 */
export function assertToolContractShape(
  tools: ToolDefinition[],
  expected: ToolContractExpectation,
): void {
  expect(tools.map((t) => t.name).sort()).toEqual(
    [...expected.reads, ...expected.writes].sort(),
  );
  for (const t of tools) {
    expect(t.description.length).toBeGreaterThan(20);
  }
  for (const name of expected.reads) {
    const t = tools.find((x) => x.name === name)!;
    expect(t.requiredScope).toBe('read');
  }
  for (const name of expected.writes) {
    const t = tools.find((x) => x.name === name)!;
    expect(t.requiredScope).toBe('write');
  }
}
