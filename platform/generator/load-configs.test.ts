import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { clearRegistry, getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { loadConfigs } from './load-configs';

describe('loadConfigs', () => {
  it('imports every *.ts file under the given root', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cfg-'));
    try {
      const mod = path.join(root, 'shop', 'catalogs');
      mkdirSync(mod, { recursive: true });
      writeFileSync(
        path.join(mod, 'item.ts'),
        `
          import { defineCatalog, field } from '${JSON.stringify(
            path.resolve(__dirname, '../metadata/index.ts'),
          ).slice(1, -1)}';
          defineCatalog({
            module: 'shop',
            name: 'item',
            label: { en: 'Item' },
            fields: { name: field.string({ label: { en: 'Name' } }) },
            permissions: { read: 'any', write: 'any' },
          });
        `,
      );
      clearRegistry();
      await loadConfigs(root);
      expect(getRegistry().catalog['shop.item']).toBeDefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
