import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '.env.local' });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '.next',
      'tests/e2e/**',
      'dist',
      '.worktrees/**',
      'packages/**',
    ],
    globals: true,
    setupFiles: [],
    // next-intl ships ESM that imports `next/navigation` without an extension;
    // Vitest's native ESM resolver chokes on it. Inlining next-intl routes it
    // through the transform pipeline so the import resolves. Required for tests
    // that import the real route graph (e.g. app/api/mcp/route.test.ts).
    server: { deps: { inline: ['next-intl'] } },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
