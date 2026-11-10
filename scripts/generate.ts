import path from 'node:path';
import { runGenerator } from '@/platform/generator';

// Wrapped in IIFE instead of top-level await: the repo's package.json has no
// `"type": "module"`, so tsx runs this file in CJS mode and rejects top-level
// await. Renaming to .mts was considered but fails on Node 25 + tsx 4.21 due
// to a CJS-to-ESM named-export interop issue when .mts imports .ts via the
// `@/` path alias. IIFE is the smallest working change.
void (async () => {
  const repoRoot = process.cwd();
  await runGenerator({
    configsDir: path.join(repoRoot, 'configs'),
    schemaPath: path.join(repoRoot, 'prisma', 'schema.prisma'),
    typesOut: path.join(repoRoot, 'lib', 'generated', 'types.ts'),
    navOut: path.join(repoRoot, 'lib', 'generated', 'nav.ts'),
  });
  process.stdout.write('generated: prisma block, lib/generated/types.ts, lib/generated/nav.ts\n');
})();
