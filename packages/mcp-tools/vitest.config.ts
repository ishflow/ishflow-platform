import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

/**
 * Local vitest config for @ishflow/mcp-tools.
 *
 * The package's tests cover:
 *   - leaf modules (error-map, i18n, zod-to-json-schema, dispatch) that have
 *     no `@/` imports;
 *   - the codegen output under `src/generated/`, which DOES import
 *     `@/platform/engine/crud`, `@/platform/engine/audit-log`, etc.
 *
 * The `@/` alias resolves to the repo root (two levels up) so the codegen
 * tests can pull in the real engine surface. The repo-root vitest.config.ts
 * excludes `packages/**` so the package runs its own suite via
 * `pnpm --filter @ishflow/mcp-tools test`.
 *
 * `.env.local` is loaded here because the engine surface boots Prisma's
 * `assertRuntimeRoleSafe` startup guard on first import, which needs
 * `DATABASE_URL`. Without this load the test pass succeeds but logs an
 * unhandled Prisma rejection that fails the suite at the runner level.
 */
config({ path: path.resolve(__dirname, '..', '..', '.env.local') });
// Skip the runtime DB role guard in package-local tests. The catalog-tools
// tests assert against tool surface (names, schemas, scopes) and never touch
// a live database; importing the engine surface would otherwise trigger
// `assertRuntimeRoleSafe`, which logs an unhandled rejection when Postgres
// isn't reachable on the dev box.
process.env.SKIP_DB_ROLE_CHECK = '1';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', '..'),
    },
  },
});
