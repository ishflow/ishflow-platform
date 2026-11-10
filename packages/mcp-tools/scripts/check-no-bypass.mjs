#!/usr/bin/env node
/**
 * CI guard: fail if `withBypass` appears in any runtime source under
 * `packages/mcp-tools/src`.
 *
 * The MCP tools package is contractually RLS-only — every Prisma read/write
 * must go through `withTenant` so the API-key tenant scope cannot be escaped.
 * `withBypass` exists in the platform for trusted server flows (Clerk sync,
 * migrations, internal cron) and must never be reachable from an MCP tool
 * handler.
 *
 * Block/line comments AND string literals are stripped before matching, so
 * JSDoc rationale lines and tool descriptions that mention `withBypass`
 * factually (e.g. "this package is contractually withBypass-free") stay
 * legal. What we actually want to ban is a real call site / import.
 *
 * Exit codes:
 *   0 — clean
 *   1 — at least one runtime occurrence of `withBypass` found
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files packages/mcp-tools/src', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f.endsWith('.ts'));

const offenders = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // Strip block comments + single-line comments + string literals before
  // matching. We only ban actual usage (imports / call sites), not factual
  // mentions in descriptions or JSDoc rationale.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '') // /* ... */
    .replace(/\/\/.*$/gm, '') // // ...
    .replace(/'(?:\\.|[^'\\])*'/g, "''") // '...'
    .replace(/"(?:\\.|[^"\\])*"/g, '""') // "..."
    .replace(/`(?:\\.|[^`\\])*`/g, '``'); // `...`
  if (/\bwithBypass\b/.test(stripped)) offenders.push(f);
}

if (offenders.length) {
  console.error('withBypass is forbidden in packages/mcp-tools/src runtime code. Found in:');
  for (const f of offenders) console.error('  -', f);
  process.exit(1);
}
console.log('OK — no withBypass usage in packages/mcp-tools/src runtime code.');
